package com.netwake.native

import android.util.Log
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

/**
 * Wake-on-LAN magic packet engine.
 * 
 * Deterministic. No IP assumptions. No TCP. No polling.
 */
object WolEngine {
    private const val TAG = "NetWake:WolEngine"
    private const val MAC_LENGTH = 6
    private const val MAGIC_HEADER = 6 // 6 × 0xFF
    private const val MAC_REPEAT = 16
    private const val PACKET_SIZE = MAGIC_HEADER + (MAC_LENGTH * MAC_REPEAT) // 102 bytes
    
    /**
     * Send WoL magic packet to specified MAC address.
     * 
     * @param macAddress Target MAC (format: "AA:BB:CC:DD:EE:FF" or "AA-BB-CC-DD-EE-FF")
     * @param broadcastIp Broadcast address (default: "255.255.255.255")
     * @param port UDP port (default: 9)
     * @param retries Number of retry attempts (default: 3)
     * @return true if all packets sent successfully
     */
    fun wake(
        macAddress: String,
        broadcastIp: String = "255.255.255.255",
        port: Int = 9,
        retries: Int = 3
    ): Boolean {
        val macBytes = parseMac(macAddress) ?: run {
            Log.e(TAG, "Invalid MAC address: $macAddress")
            return false
        }
        
        val packet = buildMagicPacket(macBytes)
        
        return try {
            DatagramSocket().use { socket ->
                socket.broadcast = true
                val address = InetAddress.getByName(broadcastIp)
                
                repeat(retries) { attempt ->
                    val datagram = DatagramPacket(packet, packet.size, address, port)
                    socket.send(datagram)
                    
                    Log.d(TAG, "WoL sent to $macAddress (attempt ${attempt + 1}/$retries)")
                    
                    if (attempt < retries - 1) {
                        Thread.sleep(1000) // 1s gap between retries
                    }
                }
                true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send WoL to $macAddress", e)
            false
        }
    }
    
    /**
     * Build magic packet: 6 × 0xFF + 16 × MAC
     */
    private fun buildMagicPacket(mac: ByteArray): ByteArray {
        require(mac.size == MAC_LENGTH) { "MAC must be 6 bytes" }
        
        val packet = ByteArray(PACKET_SIZE)
        
        // Header: 6 × 0xFF
        for (i in 0 until MAGIC_HEADER) {
            packet[i] = 0xFF.toByte()
        }
        
        // Body: 16 × MAC address
        for (i in 0 until MAC_REPEAT) {
            val offset = MAGIC_HEADER + (i * MAC_LENGTH)
            System.arraycopy(mac, 0, packet, offset, MAC_LENGTH)
        }
        
        return packet
    }
    
    /**
     * Parse MAC address string to byte array.
     * Accepts: "AA:BB:CC:DD:EE:FF" or "AA-BB-CC-DD-EE-FF"
     */
    private fun parseMac(mac: String): ByteArray? {
        val cleaned = mac.replace(":", "").replace("-", "").uppercase()
        
        if (cleaned.length != MAC_LENGTH * 2) {
            return null
        }
        
        return try {
            ByteArray(MAC_LENGTH) { i ->
                val pos = i * 2
                cleaned.substring(pos, pos + 2).toInt(16).toByte()
            }
        } catch (e: NumberFormatException) {
            null
        }
    }
    
    /**
     * Validate MAC address format.
     */
    fun isValidMac(mac: String): Boolean {
        return parseMac(mac) != null
    }
}
