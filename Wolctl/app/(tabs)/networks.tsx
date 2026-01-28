import { StyleSheet, View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ConfigStorage } from '@/lib/config-storage';

export default function NetworksScreen() {
  const [ssids, setSsids] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [newSsid, setNewSsid] = useState('');

  useEffect(() => {
    loadSsids();
  }, []);

  const loadSsids = async () => {
    const config = await ConfigStorage.load();
    setSsids(config.trustedSsids);
  };

  const handleAdd = () => {
    setEditing(true);
    setNewSsid('');
  };

  const handleSave = async () => {
    const trimmed = newSsid.trim();
    if (!trimmed) {
      Alert.alert('Error', 'SSID cannot be empty');
      return;
    }

    if (ssids.includes(trimmed)) {
      Alert.alert('Error', 'This SSID is already in the list');
      return;
    }

    await ConfigStorage.addTrustedSsid(trimmed);
    setEditing(false);
    loadSsids();
  };

  const handleDelete = async (ssid: string) => {
    Alert.alert(
      'Remove Network',
      `Remove "${ssid}" from trusted networks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await ConfigStorage.removeTrustedSsid(ssid);
            loadSsids();
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="title">Networks</ThemedText>
          <Pressable style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <ThemedText style={styles.infoText}>
            NetWake will only send WoL packets when connected to these trusted Wi-Fi networks
          </ThemedText>
        </View>

        {editing && (
          <View style={styles.editor}>
            <ThemedText type="defaultSemiBold">Add Trusted Network</ThemedText>
            
            <TextInput
              style={styles.input}
              placeholder="Wi-Fi SSID (e.g., HomeWiFi)"
              placeholderTextColor="#999"
              value={newSsid}
              onChangeText={setNewSsid}
              autoFocus
            />

            <View style={styles.editorActions}>
              <Pressable style={styles.buttonSecondary} onPress={() => setEditing(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.buttonPrimary} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        {ssids.length === 0 && !editing && (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyText}>
              No trusted networks configured
            </ThemedText>
            <ThemedText style={styles.hint}>
              Add your home Wi-Fi SSID to enable automatic wake
            </ThemedText>
          </View>
        )}

        {ssids.map((ssid) => (
          <View key={ssid} style={styles.ssidCard}>
            <View style={styles.ssidInfo}>
              <ThemedText type="defaultSemiBold">{ssid}</ThemedText>
            </View>
            <Pressable onPress={() => handleDelete(ssid)}>
              <Text style={styles.deleteText}>Remove</Text>
            </Pressable>
          </View>
        ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.8,
  },
  editor: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 12,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    fontSize: 16,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  hint: {
    fontSize: 14,
    opacity: 0.4,
    textAlign: 'center',
  },
  ssidCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ssidInfo: {
    flex: 1,
  },
  deleteText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
});
