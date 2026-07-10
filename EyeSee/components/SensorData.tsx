import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { SensorReading } from '../types';
import { SENSOR_POLL_INTERVAL_MS, ESP32_ENDPOINTS } from '../constants';

const SensorData: React.FC = () => {
  const [ipInput, setIpInput] = useState('');
  const [connectedIp, setConnectedIp] = useState<string | null>(null);
  const [reading, setReading] = useState<SensorReading>({
    temperature: null,
    humidity: null,
    ir: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!connectedIp) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const [dhtRes, irRes] = await Promise.all([
          fetch(`http://${connectedIp}${ESP32_ENDPOINTS.DHT}`),
          fetch(`http://${connectedIp}${ESP32_ENDPOINTS.IR}`),
        ]);
        const dht = await dhtRes.json();
        const ir = await irRes.json();
        if (cancelled || !isMounted.current) return;
        setReading({
          temperature: typeof dht.temperature === 'number' ? dht.temperature : null,
          humidity: typeof dht.humidity === 'number' ? dht.humidity : null,
          ir: ir.ir === 0 || ir.ir === 1 ? (ir.ir as 0 | 1) : null,
        });
        setLastUpdated(new Date());
        setError(null);
      } catch (e: any) {
        if (cancelled || !isMounted.current) return;
        setError(`Failed to reach ${connectedIp}`);
      }
    };

    poll();
    const interval = setInterval(poll, SENSOR_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connectedIp]);

  const handleConnect = () => {
    const trimmed = ipInput.trim();
    if (!trimmed) return;
    setError(null);
    setReading({ temperature: null, humidity: null, ir: null });
    setLastUpdated(null);
    setConnectedIp(trimmed);
  };

  const handleDisconnect = () => {
    setConnectedIp(null);
    setError(null);
  };

  const irLabel =
    reading.ir === 0 ? 'DETECTED' : reading.ir === 1 ? 'CLEAR' : '—';
  const irColor =
    reading.ir === 0 ? '#D97706' : reading.ir === 1 ? '#0891B2' : '#94A3B8';

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Live Sensors</Text>

      <View style={styles.connectCard}>
        <Text style={styles.label}>ESP32 IP Address</Text>
        <TextInput
          style={styles.input}
          value={ipInput}
          onChangeText={setIpInput}
          placeholder="e.g. 192.168.1.42"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          editable={!connectedIp}
        />
        {connectedIp ? (
          <TouchableOpacity
            style={[styles.button, styles.buttonDisconnect]}
            onPress={handleDisconnect}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, styles.buttonDisconnectText]}>Disconnect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleConnect}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
        )}
        {connectedIp && (
          <Text style={styles.statusConnected}>● Connected to {connectedIp}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Temperature</Text>
        <Text style={styles.value}>
          {reading.temperature !== null ? reading.temperature.toFixed(1) : '—'}
          <Text style={styles.unit}> °C</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Humidity</Text>
        <Text style={styles.value}>
          {reading.humidity !== null ? reading.humidity.toFixed(1) : '—'}
          <Text style={styles.unit}> %</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>IR Sensor</Text>
        <Text style={[styles.value, { color: irColor }]}>{irLabel}</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.footer}>
        {connectedIp
          ? lastUpdated
            ? `Last updated: ${formatTime(lastUpdated)}`
            : 'Waiting for first reading…'
          : 'Connect to view live readings'}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  connectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 12,
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#0F172A',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#0891B2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisconnect: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonDisconnectText: {
    color: '#B91C1C',
  },
  statusConnected: {
    color: '#059669',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 6,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.8,
  },
  unit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 13,
  },
  footer: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default SensorData;
