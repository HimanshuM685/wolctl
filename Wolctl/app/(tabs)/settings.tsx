import { StyleSheet, View, Text, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ConfigStorage } from '@/lib/config-storage';

export default function SettingsScreen() {
  const [stabilizationDelay, setStabilizationDelay] = useState('60');
  const [cooldownWindow, setCooldownWindow] = useState('300');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const config = await ConfigStorage.load();
    setStabilizationDelay((config.stabilizationDelay / 1000).toString());
    setCooldownWindow((config.cooldownWindow / 1000).toString());
  };

  const handleDelayChange = async (value: string) => {
    setStabilizationDelay(value);
    const seconds = parseInt(value) || 60;
    await ConfigStorage.updateSettings({ stabilizationDelay: seconds * 1000 });
  };

  const handleCooldownChange = async (value: string) => {
    setCooldownWindow(value);
    const seconds = parseInt(value) || 300;
    await ConfigStorage.updateSettings({ cooldownWindow: seconds * 1000 });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>Settings</ThemedText>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Stabilization Delay</ThemedText>
          <ThemedText style={styles.description}>
            Wait time after Wi-Fi reconnects before sending WoL packets. Allows router and switches to fully boot.
          </ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={stabilizationDelay}
              onChangeText={handleDelayChange}
              keyboardType="numeric"
            />
            <ThemedText style={styles.unit}>seconds</ThemedText>
          </View>
          <ThemedText style={styles.hint}>Recommended: 30-120 seconds</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Cooldown Window</ThemedText>
          <ThemedText style={styles.description}>
            Minimum time between automatic wake attempts. Prevents wake loops.
          </ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={cooldownWindow}
              onChangeText={handleCooldownChange}
              keyboardType="numeric"
            />
            <ThemedText style={styles.unit}>seconds</ThemedText>
          </View>
          <ThemedText style={styles.hint}>Recommended: 300 seconds (5 minutes)</ThemedText>
        </View>

        <View style={styles.infoBox}>
          <ThemedText type="defaultSemiBold">How NetWake Works</ThemedText>
          <ThemedText style={styles.infoText}>
            {`1. Power cut → Router OFF → Wi-Fi disconnect
2. Power restored → Router ON → Wi-Fi reconnect
3. Stabilization delay (router boots fully)
4. Send WoL magic packets to all devices
5. Return to monitoring state`}
          </ThemedText>
        </View>

        <View style={styles.infoBox}>
          <ThemedText type="defaultSemiBold">About NetWake</ThemedText>
          <ThemedText style={styles.infoText}>
            NetWake is a deterministic network sentinel for homelabs. It turns an old Android phone into an always-on WoL sender.
          </ThemedText>
          <ThemedText style={styles.infoText}>
            No polling. No guessing. No cloud. Just boring reliability.
          </ThemedText>
        </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  description: {
    marginTop: 8,
    marginBottom: 12,
    opacity: 0.7,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    fontSize: 16,
    width: 100,
  },
  unit: {
    opacity: 0.6,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
});
