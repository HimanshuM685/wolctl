package com.netwake.native

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * NetWake foreground service.
 * 
 * State machine:
 * [Wi-Fi disconnected] → [Wi-Fi connected to trusted SSID] → 
 * [Stabilization delay] → [Send WoL packets] → [Idle + listen]
 */
class NetworkMonitorService : Service() {
    
    companion object {
        private const val TAG = "NetWake:Service"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "netwake_monitor"
        
        const val ACTION_START = "com.netwake.ACTION_START"
        const val ACTION_STOP = "com.netwake.ACTION_STOP"
        const val ACTION_WAKE_NOW = "com.netwake.ACTION_WAKE_NOW"
        
        private const val PREFS_NAME = "netwake_config"
        private const val KEY_DEVICES = "devices"
        private const val KEY_TRUSTED_SSIDS = "trusted_ssids"
        private const val KEY_STABILIZATION_DELAY = "stabilization_delay"
        private const val KEY_COOLDOWN_WINDOW = "cooldown_window"
        
        private const val DEFAULT_STABILIZATION_DELAY = 60_000L // 60s
        private const val DEFAULT_COOLDOWN_WINDOW = 300_000L // 5min
    }
    
    private lateinit var connectivityManager: ConnectivityManager
    private lateinit var wifiManager: WifiManager
    private lateinit var powerManager: PowerManager
    private lateinit var prefs: SharedPreferences
    private lateinit var handler: Handler
    
    private var wakeLock: PowerManager.WakeLock? = null
    private var lastWakeTimestamp = 0L
    private var stabilizationRunnable: Runnable? = null
    
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            Log.d(TAG, "Network available")
            checkWifiAndTrigger()
        }
        
        override fun onLost(network: Network) {
            Log.d(TAG, "Network lost")
            cancelStabilization()
        }
        
        override fun onCapabilitiesChanged(
            network: Network,
            capabilities: NetworkCapabilities
        ) {
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                Log.d(TAG, "Wi-Fi capabilities changed")
                checkWifiAndTrigger()
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        
        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        handler = Handler(Looper.getMainLooper())
        
        // Acquire partial wake lock to survive MIUI's aggressive power management
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "NetWake::MonitorLock"
        ).apply {
            acquire()
        }
        
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Monitoring network"))
        
        registerNetworkCallback()
        
        Log.i(TAG, "Service started")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                Log.d(TAG, "Explicit START received")
            }
            ACTION_STOP -> {
                Log.d(TAG, "STOP requested")
                stopSelf()
            }
            ACTION_WAKE_NOW -> {
                Log.d(TAG, "Manual WAKE_NOW triggered")
                sendWakePackets(manual = true)
            }
        }
        
        return START_STICKY // Auto-restart on kill
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        
        cancelStabilization()
        connectivityManager.unregisterNetworkCallback(networkCallback)
        wakeLock?.release()
        
        Log.i(TAG, "Service stopped")
    }
    
    private fun registerNetworkCallback() {
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .build()
        
        connectivityManager.registerNetworkCallback(request, networkCallback)
    }
    
    private fun checkWifiAndTrigger() {
        val currentSsid = getCurrentSsid() ?: run {
            Log.d(TAG, "No SSID available")
            return
        }
        
        val trustedSsids = getTrustedSsids()
        if (currentSsid !in trustedSsids) {
            Log.d(TAG, "SSID '$currentSsid' not trusted")
            return
        }
        
        Log.i(TAG, "Trusted Wi-Fi connected: $currentSsid")
        scheduleStabilizationDelay()
    }
    
    private fun scheduleStabilizationDelay() {
        cancelStabilization() // Cancel any existing delay
        
        val delay = prefs.getLong(KEY_STABILIZATION_DELAY, DEFAULT_STABILIZATION_DELAY)
        
        stabilizationRunnable = Runnable {
            Log.i(TAG, "Stabilization complete, sending WoL packets")
            sendWakePackets(manual = false)
        }.also {
            handler.postDelayed(it, delay)
        }
        
        updateNotification("Stabilizing (${delay / 1000}s)...")
        Log.d(TAG, "Stabilization delay scheduled: ${delay}ms")
    }
    
    private fun cancelStabilization() {
        stabilizationRunnable?.let {
            handler.removeCallbacks(it)
            stabilizationRunnable = null
            updateNotification("Monitoring network")
            Log.d(TAG, "Stabilization cancelled")
        }
    }
    
    private fun sendWakePackets(manual: Boolean) {
        if (!manual) {
            val cooldown = prefs.getLong(KEY_COOLDOWN_WINDOW, DEFAULT_COOLDOWN_WINDOW)
            val timeSinceLastWake = System.currentTimeMillis() - lastWakeTimestamp
            
            if (timeSinceLastWake < cooldown) {
                Log.w(TAG, "Cooldown active, skipping wake (${timeSinceLastWake / 1000}s ago)")
                return
            }
        }
        
        val devices = getDevices()
        if (devices.isEmpty()) {
            Log.w(TAG, "No devices configured")
            updateNotification("No devices configured")
            return
        }
        
        Log.i(TAG, "Sending WoL to ${devices.size} device(s)")
        updateNotification("Waking ${devices.size} device(s)...")
        
        var successCount = 0
        devices.forEach { device ->
            val mac = device.optString("mac")
            val name = device.optString("name", "Unknown")
            
            if (WolEngine.isValidMac(mac)) {
                val success = WolEngine.wake(mac)
                if (success) {
                    successCount++
                    Log.i(TAG, "✓ Woke $name ($mac)")
                } else {
                    Log.e(TAG, "✗ Failed to wake $name ($mac)")
                }
            } else {
                Log.e(TAG, "Invalid MAC for $name: $mac")
            }
        }
        
        lastWakeTimestamp = System.currentTimeMillis()
        updateNotification("Sent $successCount/$${devices.size} packets")
        
        // Reset to monitoring after 5s
        handler.postDelayed({
            updateNotification("Monitoring network")
        }, 5000)
    }
    
    private fun getCurrentSsid(): String? {
        return try {
            val wifiInfo = wifiManager.connectionInfo
            wifiInfo?.ssid?.removeSurrounding("\"")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get SSID", e)
            null
        }
    }
    
    private fun getTrustedSsids(): Set<String> {
        val json = prefs.getString(KEY_TRUSTED_SSIDS, null) ?: return emptySet()
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { array.getString(it) }.toSet()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse trusted SSIDs", e)
            emptySet()
        }
    }
    
    private fun getDevices(): List<JSONObject> {
        val json = prefs.getString(KEY_DEVICES, null) ?: return emptyList()
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { array.getJSONObject(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse devices", e)
            emptyList()
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Network Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "NetWake network monitoring"
                setShowBadge(false)
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
    
    private fun buildNotification(status: String): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        return Notification.Builder(this, CHANNEL_ID).apply {
            setContentTitle("NetWake")
            setContentText(status)
            setSmallIcon(android.R.drawable.ic_dialog_info)
            setContentIntent(pendingIntent)
            setOngoing(true)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
            }
        }.build()
    }
    
    private fun updateNotification(status: String) {
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, buildNotification(status))
    }
}
