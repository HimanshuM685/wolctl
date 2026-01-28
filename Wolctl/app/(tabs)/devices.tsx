import { StyleSheet, View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import NetWakeNative from '@/modules/netwake-native';
import { ConfigStorage } from '@/lib/config-storage';
import type { Device } from '@/modules/netwake-native';

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mac, setMac] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    const config = await ConfigStorage.load();
    setDevices(config.devices);
  };

  const handleAdd = () => {
    setEditing('new');
    setName('');
    setMac('');
    setNotes('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Device name is required');
      return;
    }

    const isValid = await NetWakeNative.validateMac(mac);
    if (!isValid) {
      Alert.alert('Error', 'Invalid MAC address format. Use AA:BB:CC:DD:EE:FF');
      return;
    }

    const device: Device = {
      id: editing === 'new' ? Date.now().toString() : editing!,
      name: name.trim(),
      mac: mac.trim().toUpperCase(),
      notes: notes.trim(),
      enabled: true,
    };

    if (editing === 'new') {
      await ConfigStorage.addDevice(device);
    } else {
      await ConfigStorage.updateDevice(device.id, device);
    }

    setEditing(null);
    loadDevices();
  };

  const handleEdit = (device: Device) => {
    setEditing(device.id);
    setName(device.name);
    setMac(device.mac);
    setNotes(device.notes || '');
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Device',
      'Are you sure you want to delete this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await ConfigStorage.deleteDevice(id);
            loadDevices();
          },
        },
      ]
    );
  };

  const handleToggle = async (device: Device) => {
    await ConfigStorage.updateDevice(device.id, { enabled: !device.enabled });
    loadDevices();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="title">Devices</ThemedText>
          <Pressable style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>

        {editing && (
          <View style={styles.editor}>
            <ThemedText type="defaultSemiBold">
              {editing === 'new' ? 'New Device' : 'Edit Device'}
            </ThemedText>
            
            <TextInput
              style={styles.input}
              placeholder="Device name (e.g., Proxmox, NAS)"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="MAC address (AA:BB:CC:DD:EE:FF)"
              placeholderTextColor="#999"
              value={mac}
              onChangeText={setMac}
              autoCapitalize="characters"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Notes (optional)"
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.editorActions}>
              <Pressable style={styles.buttonSecondary} onPress={() => setEditing(null)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.buttonPrimary} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        {devices.length === 0 && !editing && (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyText}>
              No devices configured yet
            </ThemedText>
            <ThemedText style={styles.hint}>
              Add your servers' MAC addresses to wake them automatically
            </ThemedText>
          </View>
        )}

        {devices.map((device) => (
          <View key={device.id} style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <Pressable onPress={() => handleToggle(device)}>
                <View style={[styles.checkbox, device.enabled && styles.checkboxChecked]}>
                  {device.enabled && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
              <View style={styles.deviceInfo}>
                <ThemedText type="defaultSemiBold">{device.name}</ThemedText>
                <ThemedText style={styles.mac}>{device.mac}</ThemedText>
                {device.notes && (
                  <ThemedText style={styles.notes}>{device.notes}</ThemedText>
                )}
              </View>
            </View>
            <View style={styles.deviceActions}>
              <Pressable onPress={() => handleEdit(device)}>
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(device.id)}>
                <Text style={[styles.actionText, styles.actionDelete]}>Delete</Text>
              </Pressable>
            </View>
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
    marginBottom: 24,
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
  deviceCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  deviceHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceInfo: {
    flex: 1,
    gap: 4,
  },
  mac: {
    fontFamily: 'monospace',
    fontSize: 12,
    opacity: 0.6,
  },
  notes: {
    fontSize: 12,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  actionDelete: {
    color: '#F44336',
  },
});
