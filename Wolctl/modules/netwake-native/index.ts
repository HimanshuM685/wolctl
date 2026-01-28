import { NativeModules } from 'react-native';

export interface Device {
  id: string;
  name: string;
  mac: string;
  notes?: string;
  enabled: boolean;
}

export interface NetWakeConfig {
  devices: Device[];
  trustedSsids: string[];
  stabilizationDelay: number; // milliseconds
  cooldownWindow: number; // milliseconds
}

export interface NetWakeNativeModule {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  wakeNow(): Promise<boolean>;
  validateMac(mac: string): Promise<boolean>;
  syncConfig(
    devicesJson: string,
    trustedSsidsJson: string,
    stabilizationDelay: number,
    cooldownWindow: number
  ): Promise<boolean>;
}

const nativeModule = NativeModules.NetWakeNative as NetWakeNativeModule | undefined;

// Fallback implementation so the app can run on platforms/environments
// where the native module is not available (e.g. web, dev preview).
const fallbackModule: NetWakeNativeModule = {
  async startService() {
    return false;
  },
  async stopService() {
    return false;
  },
  async wakeNow() {
    return false;
  },
  async validateMac(mac: string) {
    // Basic MAC validation: AA:BB:CC:DD:EE:FF
    const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    return macRegex.test(mac.trim());
  },
  async syncConfig() {
    // No-op in JS fallback; native service just won't see config.
    return true;
  },
};

const NetWakeNative: NetWakeNativeModule = nativeModule ?? fallbackModule;

export default NetWakeNative;
