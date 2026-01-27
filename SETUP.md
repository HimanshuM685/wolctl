# NetWake Setup & Testing Guide

## Quick Start

### 1. Add Your Proxmox Device

In the app:
1. Go to **Devices** tab
2. Tap **+ Add**
3. Enter:
   - **Name**: `Proxmox` (or whatever you want)
   - **MAC**: Your Proxmox server's Ethernet MAC address (e.g., `AA:BB:CC:DD:EE:FF`)
   - **Notes**: Optional
4. Tap **Save**

### 2. Add Your Wi-Fi Network

1. Go to **Networks** tab
2. Tap **+ Add**
3. Enter your home Wi-Fi SSID (exact name)
4. Tap **Save**

### 3. Configure Timing (Optional)

1. Go to **Settings** tab
2. Adjust:
   - **Stabilization Delay**: 60s (default) - time to wait after Wi-Fi reconnects
   - **Cooldown Window**: 300s (default) - minimum time between automatic wakes

### 4. Start the Service

1. Go to **Monitor** tab
2. Tap **Start Service**
3. You should see green indicator showing "Monitoring"

## Testing the Flow

### Test 1: Manual Wake (Immediate)

1. Go to **Monitor** tab
2. Tap **Wake All Now**
3. Check your Proxmox - it should receive the WoL packet and boot

**What happens:**
- App sends UDP broadcast to `255.255.255.255:9`
- Magic packet contains: `FF FF FF FF FF FF` + your MAC × 16
- Proxmox NIC receives packet and triggers boot

### Test 2: Automatic Wake (Wi-Fi Reconnect)

**Scenario:** Simulate power outage + restore

1. Make sure service is running (Monitor tab shows "Monitoring")
2. Turn OFF your Wi-Fi router
3. Wait 5 seconds
4. Turn ON your Wi-Fi router
5. Wait for phone to reconnect to Wi-Fi
6. After stabilization delay (60s default), NetWake sends WoL to Proxmox

**What happens:**
```
[Power cut]
  ↓
Router OFF → Phone loses Wi-Fi
  ↓
[Power restored]
  ↓
Router boots → Phone reconnects to Wi-Fi
  ↓
NetWake detects: "Wi-Fi connected to trusted SSID"
  ↓
Wait 60s (stabilization delay)
  ↓
Send WoL magic packet to Proxmox MAC
  ↓
Proxmox boots!
```

### Test 3: Non-Trusted Network (Should NOT Wake)

1. Connect to a different Wi-Fi network (not in your trusted list)
2. NetWake should NOT send WoL packets
3. Check logs: "SSID 'OtherWiFi' not trusted"

## Verifying WoL Packet Sent

Check Android logcat for NetWake logs:

```bash
adb logcat | grep "NetWake"
```

You should see:
```
NetWake:Service: Trusted Wi-Fi connected: YourWiFi
NetWake:Service: Stabilization delay scheduled: 60000ms
NetWake:Service: Stabilization complete, sending WoL packets
NetWake:WolEngine: WoL sent to AA:BB:CC:DD:EE:FF (attempt 1/3)
NetWake:WolEngine: WoL sent to AA:BB:CC:DD:EE:FF (attempt 2/3)
NetWake:WolEngine: WoL sent to AA:BB:CC:DD:EE:FF (attempt 3/3)
NetWake:Service: ✓ Woke Proxmox (AA:BB:CC:DD:EE:FF)
```

## Troubleshooting

### Proxmox Not Waking

1. **Enable WoL on Proxmox:**
   ```bash
   # On Proxmox host
   ethtool -s eno1 wol g  # Replace eno1 with your interface
   ```

2. **Verify MAC address:**
   ```bash
   ip link show  # Check your Ethernet interface MAC
   ```

3. **Enable in BIOS:**
   - Boot into BIOS/UEFI
   - Enable "Wake on LAN" or "Wake on PCI-E"
   - Enable "Network Stack"

4. **Check network broadcast:**
   - Ensure phone and Proxmox are on same subnet
   - Router must forward broadcast packets (usually enabled by default)

### Service Not Starting

1. Check permissions granted
2. Restart app
3. Check logcat for errors

### No WoL on Reconnect

1. Verify SSID is in trusted list (exact match, case-sensitive)
2. Check service is running (green indicator)
3. Wait for full stabilization delay
4. Check cooldown - won't wake twice within cooldown window

## Boot Persistence

After phone reboot:
1. NetWake service auto-starts via `BOOT_COMPLETED` receiver
2. Check Monitor tab - should show "Monitoring" automatically
3. If not, manually start service

## Production Setup

For always-on operation:
1. Use old Android phone
2. Keep plugged in (power adapter)
3. Disable battery optimization for NetWake app
4. Set screen timeout to minimum (or keep screen off)
5. Place near router for strong Wi-Fi signal

## Flow Summary

**Your exact use case:**

```
Power outage → Router OFF
              ↓
         NetWake detects Wi-Fi disconnect
              ↓
Power restored → Router boots
              ↓
         Phone reconnects to your Wi-Fi
              ↓
         NetWake: "Trusted SSID detected"
              ↓
         Wait 60s (router fully boots)
              ↓
         Send WoL to Proxmox MAC (3 attempts)
              ↓
         Proxmox receives magic packet
              ↓
         Proxmox boots! ✓
```

**Deterministic. Silent. Boring. Reliable.**
