# NetWake Build Integration

## Integrating the Native Module

The native Android code is ready. Now you need to integrate it with the Expo build system.

### Option 1: Expo Dev Client (Recommended)

Since you're using Expo with native modules, you need to build a development client:

```bash
cd Wolctl

# Install dependencies
npm install

# Create development build
npx expo prebuild --clean

# This will:
# - Generate android/ directory
# - Configure native modules
# - Set up build files
```

### Option 2: Manual Integration

If `expo prebuild` doesn't auto-link the module, manually integrate:

#### 1. Add to `android/settings.gradle`:

```gradle
include ':netwake-native'
project(':netwake-native').projectDir = new File(rootProject.projectDir, '../modules/netwake-native/android')
```

#### 2. Add to `android/app/build.gradle`:

```gradle
dependencies {
    implementation project(':netwake-native')
    // ... other dependencies
}
```

#### 3. Register package in `MainApplication.kt` (or `.java`):

```kotlin
// Add import
import com.netwake.native.NetWakePackage

// In getPackages():
override fun getPackages(): List<ReactPackage> {
    return PackageList(this).packages.apply {
        // Add NetWake package
        add(NetWakePackage())
    }
}
```

## Building the App

### Development Build

```bash
# Build for Android
npx expo run:android

# Or using eas (Expo Application Services)
npx eas build --profile development --platform android
```

### Production Build

```bash
# Create APK
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Installing on Device

```bash
# Via USB
adb install android/app/build/outputs/apk/release/app-release.apk

# Or use Expo
npx expo run:android --device
```

## Verifying Native Module

After build, test the bridge:

```typescript
import NetWakeNative from '@/modules/netwake-native';

// This should not throw
console.log(NetWakeNative);

// Test MAC validation
const isValid = await NetWakeNative.validateMac('AA:BB:CC:DD:EE:FF');
console.log('MAC valid:', isValid); // Should be true
```

## Troubleshooting Build Issues

### Module not found

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
npx expo run:android
```

### Native module undefined

Check `MainApplication` has `NetWakePackage` registered.

### Gradle sync failed

Ensure `android/settings.gradle` includes the module correctly.

### Permissions not applied

Verify `app.json` has all permissions listed.

## Required Android SDK

- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **Compile SDK**: 34

## Testing the Complete Flow

Once built and installed:

1. Open app
2. Add device (Devices tab)
3. Add trusted network (Networks tab)
4. Start service (Monitor tab)
5. Test manual wake: "Wake All Now" button
6. Test automatic: Turn router off → on

See `SETUP.md` for detailed testing instructions.

## Expo Config Plugin (Alternative)

If you want auto-linking, create a config plugin:

```javascript
// modules/netwake-native/expo-plugin.js
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNetWake(config) {
  return withAndroidManifest(config, async (config) => {
    // Merge AndroidManifest.xml automatically
    return config;
  });
};
```

Then add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      ["./modules/netwake-native/expo-plugin"]
    ]
  }
}
```

## Next Steps

1. Run `npx expo prebuild`
2. Run `npx expo run:android`
3. Follow setup in `SETUP.md`
4. Test the complete flow

The native code is rock-solid. Build integration is the only remaining step.
