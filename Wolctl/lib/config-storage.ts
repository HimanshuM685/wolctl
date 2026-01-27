import AsyncStorage from '@react-native-async-storage/async-storage';
import NetWakeNative from '../modules/netwake-native';
import { Device, NetWakeConfig } from '../modules/netwake-native';

const STORAGE_KEY = '@netwake_config';

const DEFAULT_CONFIG: NetWakeConfig = {
  devices: [],
  trustedSsids: [],
  stabilizationDelay: 60000, // 60s
  cooldownWindow: 300000, // 5min
};

export const ConfigStorage = {
  async load(): Promise<NetWakeConfig> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...JSON.parse(json) };
    } catch (error) {
      console.error('Failed to load config:', error);
      return DEFAULT_CONFIG;
    }
  },

  async save(config: NetWakeConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      
      // Sync to native SharedPreferences so service can access it
      await this.syncToNative(config);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  },

  async syncToNative(config: NetWakeConfig): Promise<void> {
    try {
      // Convert devices array to JSON string
      const devicesJson = JSON.stringify(config.devices);
      
      // Convert trusted SSIDs array to JSON string
      const trustedSsidsJson = JSON.stringify(config.trustedSsids);
      
      // Sync to native SharedPreferences
      await NetWakeNative.syncConfig(
        devicesJson,
        trustedSsidsJson,
        config.stabilizationDelay,
        config.cooldownWindow
      );
    } catch (error) {
      console.error('Failed to sync to native:', error);
      // Don't throw - allow save to succeed even if sync fails
    }
  },

  async addDevice(device: Device): Promise<void> {
    const config = await this.load();
    config.devices.push(device);
    await this.save(config);
  },

  async updateDevice(id: string, updates: Partial<Device>): Promise<void> {
    const config = await this.load();
    const index = config.devices.findIndex(d => d.id === id);
    if (index !== -1) {
      config.devices[index] = { ...config.devices[index], ...updates };
      await this.save(config);
    }
  },

  async deleteDevice(id: string): Promise<void> {
    const config = await this.load();
    config.devices = config.devices.filter(d => d.id !== id);
    await this.save(config);
  },

  async addTrustedSsid(ssid: string): Promise<void> {
    const config = await this.load();
    if (!config.trustedSsids.includes(ssid)) {
      config.trustedSsids.push(ssid);
      await this.save(config);
    }
  },

  async removeTrustedSsid(ssid: string): Promise<void> {
    const config = await this.load();
    config.trustedSsids = config.trustedSsids.filter(s => s !== ssid);
    await this.save(config);
  },

  async updateSettings(settings: Partial<Pick<NetWakeConfig, 'stabilizationDelay' | 'cooldownWindow'>>): Promise<void> {
    const config = await this.load();
    Object.assign(config, settings);
    await this.save(config);
  },
};
