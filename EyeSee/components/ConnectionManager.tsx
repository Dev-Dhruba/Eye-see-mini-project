import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { ConnectionStatus, ConnectionType } from '../types';
import { WifiIcon } from './icons/WifiIcon';
import { BluetoothIcon } from './icons/BluetoothIcon';

interface ConnectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (type: ConnectionType) => void;
  onDisconnect: () => void;
  currentStatus: ConnectionStatus;
}

type Tab = 'WiFi' | 'Bluetooth';

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  currentStatus,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('WiFi');
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setIsScanning(false);
      setFoundDevices([]);
      setActiveTab(currentStatus.type === 'Bluetooth' ? 'Bluetooth' : 'WiFi');
    }
  }, [isOpen, currentStatus.type]);

  const handleScan = () => {
    setIsScanning(true);
    setFoundDevices([]);
    setTimeout(() => {
      const devices =
        activeTab === 'WiFi'
          ? ['EyeSee-WiFi-A5B2', 'EyeSee-WiFi-F9C1', 'MyHome-WiFi-Eyesee']
          : ['EyeSee-BLE-9C3F', 'EyeSee-BLE-1A0D'];
      setFoundDevices(devices);
      setIsScanning(false);
    }, 2500);
  };

  const handleConnect = () => {
    onConnect(activeTab);
    setFoundDevices([]);
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modal} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Device Connection</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>&times;</Text>
            </TouchableOpacity>
          </View>

          {/* Connection Status */}
          <View style={styles.section}>
            {currentStatus.isConnected ? (
              <View style={styles.connectedSection}>
                <Text style={styles.connectedText}>Connected via {currentStatus.type}</Text>
                <TouchableOpacity style={styles.disconnectButton} onPress={onDisconnect} activeOpacity={0.7}>
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.disconnectedText}>Not connected. Scan for a device below.</Text>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'WiFi' && styles.tabActive]}
              onPress={() => {
                setActiveTab('WiFi');
                setFoundDevices([]);
                setIsScanning(false);
              }}
            >
              <WifiIcon width={18} height={18} color={activeTab === 'WiFi' ? '#0891B2' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'WiFi' && styles.tabTextActive]}>WiFi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Bluetooth' && styles.tabActive]}
              onPress={() => {
                setActiveTab('Bluetooth');
                setFoundDevices([]);
                setIsScanning(false);
              }}
            >
              <BluetoothIcon width={18} height={18} color={activeTab === 'Bluetooth' ? '#0891B2' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'Bluetooth' && styles.tabTextActive]}>Bluetooth</Text>
            </TouchableOpacity>
          </View>

          {/* Scan Content */}
          <View style={styles.scanSection}>
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.buttonDisabled]}
              onPress={handleScan}
              disabled={isScanning}
              activeOpacity={0.7}
            >
              <Text style={[styles.scanButtonText, isScanning && styles.buttonTextDisabled]}>
                {isScanning ? 'Scanning...' : `Scan for ${activeTab} Devices`}
              </Text>
            </TouchableOpacity>

            <ScrollView style={styles.deviceList}>
              {isScanning ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#0891B2" />
                  <Text style={styles.loadingText}>Searching for devices...</Text>
                </View>
              ) : foundDevices.length > 0 ? (
                foundDevices.map((device) => (
                  <View key={device} style={styles.deviceItem}>
                    <Text style={styles.deviceName}>{device}</Text>
                    <TouchableOpacity style={styles.connectButton} onPress={handleConnect} activeOpacity={0.7}>
                      <Text style={styles.connectButtonText}>Connect</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No devices found.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 22,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  closeButton: {
    fontSize: 28,
    color: '#94A3B8',
    lineHeight: 28,
  },
  section: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  connectedSection: {
    alignItems: 'center',
  },
  connectedText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '600',
  },
  disconnectButton: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 11,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#B91C1C',
    fontWeight: '600',
    fontSize: 14,
  },
  disconnectedText: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 14,
  },
  tabRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabActive: {
    borderBottomColor: '#0891B2',
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#0891B2',
  },
  scanSection: {
    padding: 22,
    height: 280,
  },
  scanButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#0891B2',
    borderRadius: 10,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    backgroundColor: '#F1F5F9',
  },
  buttonTextDisabled: {
    color: '#94A3B8',
  },
  deviceList: {
    flex: 1,
    marginTop: 14,
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 40,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  deviceName: {
    color: '#0F172A',
    fontWeight: '500',
    fontSize: 14,
  },
  connectButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#059669',
    borderRadius: 999,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});

export default ConnectionManager;
