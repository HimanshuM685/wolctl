package com.netwake.native

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import org.json.JSONArray
import org.json.JSONObject

/**
 * React Native bridge for NetWake native module.
 * 
 * Exposes service control to JavaScript layer.
 */
class NetWakeModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "NetWake:Bridge"
        private const val PREFS_NAME = "netwake_config"
        private const val KEY_DEVICES = "devices"
        private const val KEY_TRUSTED_SSIDS = "trusted_ssids"
        private const val KEY_STABILIZATION_DELAY = "stabilization_delay"
        private const val KEY_COOLDOWN_WINDOW = "cooldown_window"
    }
    
    override fun getName(): String = "NetWakeNative"
    
    /**
     * Start the network monitoring service.
     */
    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, NetworkMonitorService::class.java).apply {
                action = NetworkMonitorService.ACTION_START
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", "Failed to start service", e)
        }
    }
    
    /**
     * Stop the network monitoring service.
     */
    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, NetworkMonitorService::class.java).apply {
                action = NetworkMonitorService.ACTION_STOP
            }
            
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop service", e)
        }
    }
    
    /**
     * Manually trigger WoL packets (bypass cooldown).
     */
    @ReactMethod
    fun wakeNow(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, NetworkMonitorService::class.java).apply {
                action = NetworkMonitorService.ACTION_WAKE_NOW
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WAKE_ERROR", "Failed to trigger wake", e)
        }
    }
    
    /**
     * Validate MAC address format.
     */
    @ReactMethod
    fun validateMac(mac: String, promise: Promise) {
        try {
            val isValid = WolEngine.isValidMac(mac)
            promise.resolve(isValid)
        } catch (e: Exception) {
            promise.reject("VALIDATE_ERROR", "Failed to validate MAC", e)
        }
    }
    
    /**
     * Sync config from JS to native SharedPreferences.
     * Called by ConfigStorage after every save.
     */
    @ReactMethod
    fun syncConfig(
        devicesJson: String,
        trustedSsidsJson: String,
        stabilizationDelay: Int,
        cooldownWindow: Int,
        promise: Promise
    ) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString(KEY_DEVICES, devicesJson)
                putString(KEY_TRUSTED_SSIDS, trustedSsidsJson)
                putLong(KEY_STABILIZATION_DELAY, stabilizationDelay.toLong())
                putLong(KEY_COOLDOWN_WINDOW, cooldownWindow.toLong())
                apply()
            }
            
            Log.d(TAG, "Config synced to SharedPreferences")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to sync config", e)
            promise.reject("SYNC_ERROR", "Failed to sync config", e)
        }
    }
}
