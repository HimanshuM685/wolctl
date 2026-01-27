package com.netwake.native

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Boot persistence receiver.
 * 
 * Starts NetworkMonitorService after phone reboot.
 * Designed for always-on operation (plugged-in spare phone).
 */
class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "NetWake:BootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.i(TAG, "Boot completed, starting service")
            
            val serviceIntent = Intent(context, NetworkMonitorService::class.java).apply {
                action = NetworkMonitorService.ACTION_START
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}
