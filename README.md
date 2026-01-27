# NetWake

**Turn an old Android phone into a reliable network sentinel for your homelab.**

NetWake is an Android daemon that automatically wakes LAN servers after power or network outages by observing Wi-Fi reconnect events and sending deterministic Wake-on-LAN magic packets.

## The Problem

In many homelabs and home servers:
- Motherboards lack "Restore on AC Power Loss"
- Routers cannot send WoL on boot
- Power cuts are frequent
- Servers stay offline until manual intervention

Existing solutions fail because:
- Routers are locked
- MIUI blocks background UDP
- Automation apps are unreliable
- Dedicated hardware (Pi/ESP) is overkill

NetWake exists to turn an old Android phone into a reliable, always-on network sentinel.

## Core Philosophy

- **Deterministic > Fancy**
- **Silent > Chatty**
- **Foreground service > background hacks**
- **Infrastructure tool, not a consumer app**
- **Boring reliability is the goal**

This is a tool, not a toy.

## How It Works

```
[Wi-Fi disconnected]
        ↓
[Wi-Fi connected to trusted SSID]
        ↓
[Stabilization delay]
        ↓
[Send WoL packets]
        ↓
[Idle + listen]
```

**Power-restore detection (implicit):**
- Power cut → router OFF → Wi-Fi disconnect
- Power restore → router ON → Wi-Fi reconnect
- Reconnect = assumed power restoration

This assumption is intentional and correct.

## Features

### MVP (Implemented)

- **Network Awareness**: Listens to Wi-Fi connectivity changes, triggers only on trusted SSIDs
- **Stabilization Window**: Configurable delay (default 60s) before sending WoL packets
- **Wake-on-LAN Engine**: Sends fully compliant magic packets via UDP broadcast
- **Foreground Service**: Persistent service with minimal notification (MIUI survival)
- **Boot Persistence**: Auto-starts after phone reboot via `BOOT_COMPLETED` receiver
- **Device Management**: Add/edit/delete servers with MAC addresses
- **Network Management**: Configure trusted Wi-Fi SSIDs
- **Settings**: Configurable delays and cooldown windows

### Phase 2 (Nice-to-Have)

- Local logs viewer
- Retry logic configuration
- Export/import config (JSON)

## Setup

### Prerequisites

- Node.js 18+
- Android Studio / Android SDK
- Expo CLI

### Development

```bash
cd Wolctl
npm install
npx expo start
```

### Building for Android

1. **Configure the module**: Add to `android/settings.gradle`:
```gradle
include ':netwake-native'
project(':netwake-native').projectDir = new File(rootProject.projectDir, '../modules/netwake-native/android')
```

2. **Add dependency** in `android/app/build.gradle`:
```gradle
dependencies {
    implementation project(':netwake-native')
}
```

3. **Register package** in `MainApplication.java/kt`:
```kotlin
import com.netwake.native.NetWakePackage

override fun getPackages(): List<ReactPackage> {
    return PackageList(this).packages.apply {
        add(NetWakePackage())
    }
}
```

4. **Build APK**:
```bash
npx expo run:android
```

## Configuration

### Devices

Add your servers' MAC addresses:
- Name (e.g., "Proxmox", "NAS")
- Ethernet MAC address
- Optional notes
- Enable/disable toggle

### Networks

Add trusted Wi-Fi SSIDs:
- Only send WoL on these networks
- Prevents accidental wake on public Wi-Fi

### Settings

- **Stabilization Delay**: Wait time after Wi-Fi reconnects (default: 60s)
  - Purpose: Router fully boots, switches learn MACs, broadcast reaches NICs
  - Recommended: 30-120s
- **Cooldown Window**: Minimum time between wake attempts (default: 5min)
  - Purpose: Prevents boot loops

## Safety Features

- Rate limiting (cooldown window)
- SSID validation
- Ethernet MAC validation
- No IP-based assumptions
- No TCP ever
- No polling loops

## Explicit Non-Goals

NetWake will NOT:
- Monitor server health
- Ping devices
- Use IP addresses
- Run cloud services
- Require accounts
- Show ads
- Be "smart" with ML nonsense

**Simple. Deterministic. Reliable.**

## Target User

- Homelab builders
- Proxmox / NAS users
- People with flaky power
- Locked ISP routers
- Old Android phones lying around

## Architecture

- **UI/Config**: React Native (Expo)
- **Core daemon**: Native Android (Kotlin)
- **WoL engine**: Native UDP broadcast
- **Network monitoring**: ConnectivityManager callbacks
- **Storage**: AsyncStorage + SharedPreferences sync

## License

MIT

## Contributing

This is a personal homelab tool. Feel free to fork and adapt to your needs.

Keep it simple. Keep it deterministic. Keep it boring.
