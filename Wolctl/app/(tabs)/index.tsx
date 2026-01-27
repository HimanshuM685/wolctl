import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import NetWakeNative from '@/modules/netwake-native';
import { ConfigStorage } from '@/lib/config-storage';
import type { Device, NetWakeConfig } from '@/modules/netwake-native';

export default function MonitorScreen() {
  const [serviceRunning, setServiceRunning] = useState(false);
  const [config, setConfig] = useState<NetWakeConfig | null>(null);
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const cfg = await ConfigStorage.load();
    setConfig(cfg);
  };

  const handleStartService = async () => {
    try {
      await NetWakeNative.startService();
      setServiceRunning(true);
    } catch (error) {
      console.error('Failed to start service:', error);
    }
  };

  const handleStopService = async () => {
    try {
      await NetWakeNative.stopService();
      setServiceRunning(false);
    } catch (error) {
      console.error('Failed to stop service:', error);
    }
  };

  const handleWakeNow = async () => {
    try {
      setWaking(true);
      await NetWakeNative.wakeNow();
      setTimeout(() => setWaking(false), 2000);
    } catch (error) {
      console.error('Failed to wake:', error);
      setWaking(false);
    }
  };

  const enabledDevices = config?.devices.filter(d => d.enabled) || [];
  const hasDevices = enabledDevices.length > 0;
  const hasTrustedSsids = (config?.trustedSsids.length || 0) > 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <View style={styles.section}>
          <ThemedText type="title">NetWake</ThemedText>
          <ThemedText style={styles.subtitle}>
            Network sentinel for your homelab
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.statusRow}>
            <View style={[styles.indicator, serviceRunning ? styles.indicatorOn : styles.indicatorOff]} />
            <ThemedText type="subtitle">
              {serviceRunning ? 'Monitoring' : 'Stopped'}
            </ThemedText>
          </View>

          {serviceRunning ? (
            <Pressable style={styles.buttonSecondary} onPress={handleStopService}>
              <Text style={styles.buttonText}>Stop Service</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.buttonPrimary} onPress={handleStartService}>
              <Text style={styles.buttonText}>Start Service</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Configuration</ThemedText>
          <View style={styles.configRow}>
            <ThemedText>Devices:</ThemedText>
            <ThemedText type="defaultSemiBold">
              {enabledDevices.length} enabled
            </ThemedText>
          </View>
          <View style={styles.configRow}>
            <ThemedText>Networks:</ThemedText>
            <ThemedText type="defaultSemiBold">
              {config?.trustedSsids.length || 0} trusted
            </ThemedText>
          </View>
          <View style={styles.configRow}>
            <ThemedText>Delay:</ThemedText>
            <ThemedText type="defaultSemiBold">
              {((config?.stabilizationDelay || 0) / 1000)}s
            </ThemedText>
          </View>
        </View>

        {hasDevices && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Manual Wake</ThemedText>
            {enabledDevices.map((device) => (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceInfo}>
                  <ThemedText type="defaultSemiBold">{device.name}</ThemedText>
                  <ThemedText style={styles.deviceMac}>{device.mac}</ThemedText>
                </View>
              </View>
            ))}
            <Pressable 
              style={[styles.buttonPrimary, waking && styles.buttonDisabled]} 
              onPress={handleWakeNow}
              disabled={waking}
            >
              <Text style={styles.buttonText}>
                {waking ? 'Sending...' : 'Wake All Now'}
              </Text>
            </Pressable>
          </View>
        )}

        {!hasDevices && (
          <View style={styles.section}>
            <ThemedText style={styles.hint}>
              Add devices in the Devices tab to get started
            </ThemedText>
          </View>
        )}

        {!hasTrustedSsids && (
          <View style={styles.section}>
            <ThemedText style={styles.hint}>
              Add trusted Wi-Fi networks in the Networks tab
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  indicatorOn: {
    backgroundColor: '#4CAF50',
  },
  indicatorOff: {
    backgroundColor: '#666',
  },
  buttonPrimary: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  deviceCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  deviceInfo: {
    gap: 4,
  },
  deviceMac: {
    fontFamily: 'monospace',
    fontSize: 12,
    opacity: 0.6,
  },
  hint: {
    opacity: 0.5,
    fontStyle: 'italic',
  },
});
