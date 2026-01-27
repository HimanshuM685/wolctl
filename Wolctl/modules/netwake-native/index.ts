import { NativeModules } from 'react-native';

const { NetWakeNative } = NativeModules;

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

export default NetWakeNative as NetWakeNativeModule;
