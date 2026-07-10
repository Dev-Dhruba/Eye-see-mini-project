# ESP32 → EyeSee App: Complete Integration Guide

This document covers everything end-to-end: circuit wiring, ESP32 firmware,
and every Expo app file you need to create or modify.

---

## Table of Contents

1. [Hardware & Circuit](#1-hardware--circuit)
2. [Arduino Libraries to Install](#2-arduino-libraries-to-install)
3. [ESP32 Firmware (sketch.ino)](#3-esp32-firmware)
4. [Expo App Changes](#4-expo-app-changes)
   - 4a. `types.ts`
   - 4b. `services/esp32Service.ts` *(new file)*
   - 4c. `components/ConnectionManager.tsx`
   - 4d. `App.tsx`
5. [Step-by-Step Setup](#5-step-by-step-setup)
6. [Testing & Troubleshooting](#6-testing--troubleshooting)

---

## 1. Hardware & Circuit

### Components
| Component | Purpose | Notes |
|---|---|---|
| ESP32 DevKit v1 (or v4) | Main microcontroller + WiFi | 38-pin or 30-pin |
| IR Reflectance Sensor (TCRT5000 or analog module) | IOP proxy measurement | Analog output preferred |
| Temperature Sensor (LM35 or DS18B20) | Body/eye temperature | LM35 = simplest wiring |
| 10 kΩ resistor (×1) | DS18B20 pull-up (if used) | Skip if using LM35 |
| Breadboard + jumper wires | Prototyping | — |
| USB cable | Power + flashing | Micro-USB or USB-C depending on board |

---

### Wiring Diagram

```
ESP32 DevKit
  ┌─────────────────────────────────┐
  │  3.3V ────────────── VCC (IR sensor)
  │  GND  ────────────── GND (IR sensor)
  │  GPIO34 (ADC1_CH6) ── AOUT (IR sensor analog output)
  │                                  
  │  3.3V ────────────── VCC (LM35)
  │  GND  ────────────── GND (LM35)
  │  GPIO35 (ADC1_CH7) ── VOUT (LM35 middle pin)
  │                                  
  │  (Optional battery sense)
  │  GPIO33 (ADC1_CH5) ── midpoint of voltage divider
  │                        (100kΩ from VBAT, 100kΩ to GND)
  └─────────────────────────────────┘
```

> ⚠️ **Important:** ESP32 ADC inputs are 3.3 V max. Never connect 5 V directly
> to any GPIO. If your IR sensor module has a 5 V VCC requirement, power it from
> the ESP32's `VIN` (5 V from USB) but still take the analog output through a
> voltage divider (10 kΩ / 20 kΩ) to stay under 3.3 V.

#### LM35 Temperature Sensor Pinout
```
LM35 (flat side facing you):
  Left  pin → VCC (3.3 V)
  Middle pin → VOUT → GPIO35
  Right pin  → GND
```

#### TCRT5000 / Generic IR Module Pinout
```
Module pins:
  VCC  → 3.3 V
  GND  → GND
  AOUT → GPIO34   (analog — use this one)
  DOUT → not used
```

---

## 2. Arduino Libraries to Install

Open Arduino IDE → **Tools → Manage Libraries** and install:

| Library | Author | Version |
|---|---|---|
| **WebSockets** | Markus Sattler | ≥ 2.3.6 |
| **ArduinoJson** | Benoit Blanchon | ≥ 6.x (v7 also works) |

Also make sure the **ESP32 board package** is installed:
- File → Preferences → Additional Board Manager URLs →
  add `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
- Tools → Board → Boards Manager → search **esp32** → Install

---

## 3. ESP32 Firmware

Create a new Arduino sketch and paste the code below.  
Only change the **WiFi credentials** and **calibration constants** at the top.

```cpp
// ─────────────────────────────────────────────────────────
//  EyeSee ESP32 Sensor Node
//  Reads: IR sensor (IOP proxy) + LM35 (temperature)
//  Broadcasts JSON over WebSocket on port 81
// ─────────────────────────────────────────────────────────

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// ── CHANGE THESE ──────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ── PIN DEFINITIONS ───────────────────────────────────────
const int IR_PIN   = 34;   // Analog IR sensor output
const int TEMP_PIN = 35;   // LM35 analog output
// const int BATT_PIN = 33; // Optional battery voltage divider

// ── CALIBRATION ───────────────────────────────────────────
// Map raw ADC reading (0–4095) to IOP range (mmHg).
// Measure real baseline on your hardware and adjust.
const int IR_RAW_MIN  = 200;   // ADC value with no reflection (low pressure proxy)
const int IR_RAW_MAX  = 3800;  // ADC value with max reflection (high pressure proxy)
const float IOP_MIN   = 12.0;  // mmHg (normal low)
const float IOP_MAX   = 30.0;  // mmHg (high risk)

// ── TIMING ────────────────────────────────────────────────
const unsigned long SEND_INTERVAL_MS = 2000; // broadcast every 2 s

// ── WEBSOCKET SERVER ─────────────────────────────────────
WebSocketsServer webSocket(81);

unsigned long lastSend = 0;
uint8_t connectedClients = 0;

// ─────────────────────────────────────────────────────────
void onWebSocketEvent(uint8_t clientId, WStype_t type,
                      uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      connectedClients = (connectedClients > 0) ? connectedClients - 1 : 0;
      Serial.printf("[WS] Client #%u disconnected. Active: %u\n",
                    clientId, connectedClients);
      break;

    case WStype_CONNECTED:
      connectedClients++;
      Serial.printf("[WS] Client #%u connected from %s. Active: %u\n",
                    clientId,
                    webSocket.remoteIP(clientId).toString().c_str(),
                    connectedClients);
      break;

    case WStype_TEXT:
      // Handle any commands sent from the app (optional future use)
      Serial.printf("[WS] Received from #%u: %s\n", clientId, payload);
      break;

    default:
      break;
  }
}

// ─────────────────────────────────────────────────────────
float readIOP() {
  // Average 10 samples to reduce ADC noise
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(IR_PIN);
    delay(2);
  }
  int raw = sum / 10;

  // Clamp and map to IOP range
  raw = constrain(raw, IR_RAW_MIN, IR_RAW_MAX);
  float iop = IOP_MIN + (float)(raw - IR_RAW_MIN)
              / (IR_RAW_MAX - IR_RAW_MIN)
              * (IOP_MAX - IOP_MIN);

  // Round to 1 decimal place
  return roundf(iop * 10) / 10.0;
}

// ─────────────────────────────────────────────────────────
float readTemperature() {
  // LM35: Vout = 10 mV/°C, powered at 3.3 V
  // ESP32 ADC (12-bit): raw 0–4095 maps to 0–3.3 V
  int raw = analogRead(TEMP_PIN);
  float voltage    = (raw / 4095.0f) * 3.3f;
  float tempCelsius = voltage * 100.0f; // 10 mV/°C → ×100
  return roundf(tempCelsius * 10) / 10.0;
}

// ─────────────────────────────────────────────────────────
// Optional: read battery % from a resistor voltage divider
// (two 100 kΩ resistors between VBAT and GND, midpoint → GPIO33)
// int readBattery() {
//   int raw = analogRead(BATT_PIN);
//   float vMid = (raw / 4095.0f) * 3.3f;
//   float vBat = vMid * 2.0f; // ×2 because of equal divider
//   // 3.7 V full, 3.0 V empty
//   int pct = (int)((vBat - 3.0f) / 0.7f * 100.0f);
//   return constrain(pct, 0, 100);
// }

// ─────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== EyeSee ESP32 Node ===");

  // Set ADC attenuation to handle full 0–3.3 V range
  analogSetAttenuation(ADC_11db);

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");
  Serial.print(">>> ESP32 IP Address: ");
  Serial.println(WiFi.localIP()); // <-- type this into the app

  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
  Serial.println("WebSocket server running on port 81");
  Serial.println("Waiting for the EyeSee app to connect...");
}

// ─────────────────────────────────────────────────────────
void loop() {
  webSocket.loop(); // must be called every loop iteration

  unsigned long now = millis();
  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;

    if (connectedClients > 0) {
      float iop  = readIOP();
      float temp = readTemperature();
      // int batt = readBattery(); // uncomment if battery sense wired

      // Build JSON payload
      StaticJsonDocument<128> doc;
      doc["iop"]         = iop;
      doc["temperature"] = temp;
      doc["battery"]     = 85; // hardcode or use readBattery()
      doc["timestamp"]   = now / 1000; // seconds since boot

      String payload;
      serializeJson(doc, payload);

      webSocket.broadcastTXT(payload);
      Serial.println("Sent: " + payload);
    }
  }
}
```

**Example Serial output after flashing:**
```
=== EyeSee ESP32 Node ===
Connecting to WiFi..... Connected!
>>> ESP32 IP Address: 192.168.1.42
WebSocket server running on port 81
Waiting for the EyeSee app to connect...
[WS] Client #0 connected from 192.168.1.55. Active: 1
Sent: {"iop":18.4,"temperature":36.2,"battery":85,"timestamp":142}
Sent: {"iop":18.5,"temperature":36.3,"battery":85,"timestamp":144}
```

---

## 4. Expo App Changes

### 4a. `types.ts` — Add ESP32 data types

**Replace the entire file with:**

```typescript
export interface IOPReading {
  date: Date;
  value: number;
}

export type Screen = 'dashboard' | 'scan' | 'history';

export enum RiskLevel {
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
}

export type ConnectionType = 'WiFi' | 'Bluetooth' | 'None';

export interface ConnectionStatus {
  isConnected: boolean;
  type: ConnectionType;
}

// ── NEW: ESP32 data shape (matches JSON from firmware) ────
export interface ESP32Data {
  iop: number;           // mmHg
  temperature?: number;  // °C
  battery?: number;      // 0–100 %
  timestamp?: number;    // seconds since ESP32 boot
}

export type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
```

---

### 4b. `services/esp32Service.ts` — New file (WebSocket client)

**Create this file at `services/esp32Service.ts`:**

```typescript
/**
 * esp32Service.ts
 *
 * React hook + context that manages a WebSocket connection to the ESP32.
 * Usage:
 *   const { latestData, wsStatus, connect, disconnect } = useESP32();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ESP32Data, WSStatus } from '../types';

const STORAGE_KEY_IP   = 'esp32_ip';
const STORAGE_KEY_PORT = 'esp32_port';
const DEFAULT_PORT     = 81;
const MAX_RETRIES      = 5;
const RETRY_DELAY_MS   = 3000;

// ── Context shape ─────────────────────────────────────────────────────────────
interface ESP32ContextValue {
  latestData:    ESP32Data | null;
  wsStatus:      WSStatus;
  savedIP:       string;
  connect:       (ip: string, port?: number) => void;
  disconnect:    () => void;
}

const ESP32Context = createContext<ESP32ContextValue>({
  latestData:    null,
  wsStatus:      'disconnected',
  savedIP:       '',
  connect:       () => {},
  disconnect:    () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────
export const ESP32Provider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [latestData, setLatestData] = useState<ESP32Data | null>(null);
  const [wsStatus,   setWsStatus]   = useState<WSStatus>('disconnected');
  const [savedIP,    setSavedIP]    = useState('');

  const wsRef          = useRef<WebSocket | null>(null);
  const retryCountRef  = useRef(0);
  const retryTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef      = useRef<{ ip: string; port: number } | null>(null);

  // Load saved IP on mount and auto-connect
  useEffect(() => {
    (async () => {
      const ip   = await AsyncStorage.getItem(STORAGE_KEY_IP);
      const port = await AsyncStorage.getItem(STORAGE_KEY_PORT);
      if (ip) {
        setSavedIP(ip);
        connect(ip, port ? parseInt(port, 10) : DEFAULT_PORT);
      }
    })();
    return () => {
      cleanupSocket();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupSocket = () => {
    if (wsRef.current) {
      wsRef.current.onopen    = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror   = null;
      wsRef.current.onclose   = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connect = useCallback((ip: string, port: number = DEFAULT_PORT) => {
    // Cancel any pending retry
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    cleanupSocket();

    const trimmedIP = ip.trim();
    if (!trimmedIP) return;

    targetRef.current = { ip: trimmedIP, port };
    retryCountRef.current = 0;
    openSocket(trimmedIP, port);
  }, []);

  const openSocket = (ip: string, port: number) => {
    setWsStatus('connecting');
    const url = `ws://${ip}:${port}`;
    console.log(`[ESP32] Connecting to ${url}`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[ESP32] WebSocket connected');
      retryCountRef.current = 0;
      setWsStatus('connected');
      // Persist successful IP
      AsyncStorage.setItem(STORAGE_KEY_IP,   ip);
      AsyncStorage.setItem(STORAGE_KEY_PORT, String(port));
      setSavedIP(ip);
    };

    ws.onmessage = (event) => {
      try {
        const data: ESP32Data = JSON.parse(event.data);
        if (typeof data.iop === 'number') {
          setLatestData(data);
        }
      } catch (e) {
        console.warn('[ESP32] Failed to parse message:', event.data);
      }
    };

    ws.onerror = (error) => {
      console.warn('[ESP32] WebSocket error:', error);
      setWsStatus('error');
    };

    ws.onclose = () => {
      console.log('[ESP32] WebSocket closed');
      wsRef.current = null;

      if (
        targetRef.current &&
        retryCountRef.current < MAX_RETRIES
      ) {
        retryCountRef.current++;
        console.log(
          `[ESP32] Retrying (${retryCountRef.current}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms…`
        );
        setWsStatus('connecting');
        retryTimerRef.current = setTimeout(() => {
          if (targetRef.current) {
            openSocket(targetRef.current.ip, targetRef.current.port);
          }
        }, RETRY_DELAY_MS);
      } else {
        setWsStatus('disconnected');
      }
    };
  };

  const disconnect = useCallback(() => {
    targetRef.current = null; // prevent auto-retry
    retryCountRef.current = MAX_RETRIES;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    cleanupSocket();
    setWsStatus('disconnected');
    setLatestData(null);
    AsyncStorage.removeItem(STORAGE_KEY_IP);
    AsyncStorage.removeItem(STORAGE_KEY_PORT);
    setSavedIP('');
  }, []);

  return (
    <ESP32Context.Provider
      value={{ latestData, wsStatus, savedIP, connect, disconnect }}
    >
      {children}
    </ESP32Context.Provider>
  );
};

// ── Consumer hook ─────────────────────────────────────────────────────────────
export const useESP32 = () => useContext(ESP32Context);
```

---

### 4c. `components/ConnectionManager.tsx` — Replace fake scan with real IP input

**Replace the entire file with:**

```tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { ConnectionStatus, ConnectionType, WSStatus } from '../types';
import { WifiIcon }      from './icons/WifiIcon';
import { BluetoothIcon } from './icons/BluetoothIcon';
import { useESP32 }      from '../services/esp32Service';

interface ConnectionManagerProps {
  isOpen:        boolean;
  onClose:       () => void;
  onConnect:     (type: ConnectionType) => void;
  onDisconnect:  () => void;
  currentStatus: ConnectionStatus;
}

type Tab = 'WiFi' | 'Bluetooth';

const statusLabel: Record<WSStatus, string> = {
  disconnected: 'Not connected',
  connecting:   'Connecting…',
  connected:    'Connected ✓',
  error:        'Connection error',
};

const statusColor: Record<WSStatus, string> = {
  disconnected: '#94a3b8',
  connecting:   '#facc15',
  connected:    '#4ade80',
  error:        '#f87171',
};

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  currentStatus,
}) => {
  const { wsStatus, savedIP, connect, disconnect } = useESP32();

  const [activeTab, setActiveTab] = useState<Tab>('WiFi');
  const [ipInput,   setIpInput]   = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(currentStatus.type === 'Bluetooth' ? 'Bluetooth' : 'WiFi');
      setIpInput(savedIP); // pre-fill with last known IP
    }
  }, [isOpen, currentStatus.type, savedIP]);

  // Mirror WebSocket state → parent App connection status
  useEffect(() => {
    if (wsStatus === 'connected') {
      onConnect('WiFi');
    } else if (wsStatus === 'disconnected' || wsStatus === 'error') {
      // only notify disconnect if we were previously connected
      if (currentStatus.isConnected && currentStatus.type === 'WiFi') {
        onDisconnect();
      }
    }
  }, [wsStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    if (!ipInput.trim()) return;
    connect(ipInput.trim());
  };

  const handleDisconnect = () => {
    disconnect();
    onDisconnect();
  };

  const isConnecting = wsStatus === 'connecting';
  const isConnected  = wsStatus === 'connected';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Device Connection</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {(['WiFi', 'Bluetooth'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                {tab === 'WiFi' ? (
                  <WifiIcon
                    width={20}
                    height={20}
                    color={activeTab === tab ? '#22d3ee' : '#94a3b8'}
                  />
                ) : (
                  <BluetoothIcon
                    width={20}
                    height={20}
                    color={activeTab === tab ? '#22d3ee' : '#94a3b8'}
                  />
                )}
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── WiFi Tab ── */}
          {activeTab === 'WiFi' && (
            <View style={styles.body}>
              {/* Status badge */}
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusColor[wsStatus] },
                  ]}
                />
                <Text
                  style={[styles.statusText, { color: statusColor[wsStatus] }]}
                >
                  {statusLabel[wsStatus]}
                </Text>
                {isConnecting && (
                  <ActivityIndicator
                    size="small"
                    color="#facc15"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>

              <Text style={styles.label}>ESP32 IP Address</Text>
              <TextInput
                style={styles.input}
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="e.g. 192.168.1.42"
                placeholderTextColor="#475569"
                keyboardType="decimal-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isConnected && !isConnecting}
              />

              <Text style={styles.hint}>
                Find the IP in Arduino Serial Monitor at 115200 baud after
                flashing.
              </Text>

              {!isConnected ? (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.connectButton,
                    (isConnecting || !ipInput.trim()) && styles.buttonDisabled,
                  ]}
                  onPress={handleConnect}
                  disabled={isConnecting || !ipInput.trim()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>
                    {isConnecting ? 'Connecting…' : 'Connect'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.disconnectButton]}
                  onPress={handleDisconnect}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>Disconnect</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Bluetooth Tab (placeholder) ── */}
          {activeTab === 'Bluetooth' && (
            <View style={styles.body}>
              <Text style={styles.comingSoon}>
                Bluetooth support coming soon.{'\n'}Use WiFi to connect your ESP32
                for now.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#67e8f9',
  },
  closeButton: {
    fontSize: 20,
    color: '#94a3b8',
  },
  tabRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
    gap: 8,
  },
  tabActive: {
    borderBottomColor: '#22d3ee',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#22d3ee',
  },
  body: {
    padding: 24,
    paddingTop: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    color: '#475569',
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 18,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#06b6d4',
  },
  disconnectButton: {
    backgroundColor: 'rgba(220,38,38,0.8)',
  },
  buttonDisabled: {
    backgroundColor: '#475569',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  comingSoon: {
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingVertical: 24,
  },
});

export default ConnectionManager;
```

---

### 4d. `App.tsx` — Wire ESP32 service into the reading stream

**Replace the entire file with:**

```tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IOPReading, Screen, ConnectionStatus, ConnectionType } from './types';
import { initialReadings } from './constants';

import Dashboard       from './components/Dashboard';
import EyeScan         from './components/EyeScan';
import History         from './components/History';
import BottomNav       from './components/BottomNav';
import { EyeIcon }     from './components/icons/EyeIcon';
import ConnectionManager from './components/ConnectionManager';
import IrisBackground  from './components/IrisBackground';
import Onboarding      from './components/Onboarding';

import { ESP32Provider, useESP32 } from './services/esp32Service';

// ── Min interval between auto-added readings (ms) ─────────────────────────────
const AUTO_ADD_INTERVAL_MS = 30_000; // 30 seconds

// ── Inner app — has access to ESP32 context ────────────────────────────────────
const AppInner: React.FC = () => {
  const { latestData, wsStatus } = useESP32();

  const [readings,               setReadings]               = useState<IOPReading[]>(initialReadings);
  const [activeScreen,           setActiveScreen]           = useState<Screen>('dashboard');
  const [connectionStatus,       setConnectionStatus]       = useState<ConnectionStatus>({
    isConnected: false,
    type: 'None',
  });
  const [isConnectionModalOpen,  setIsConnectionModalOpen]  = useState(false);
  const [showOnboarding,         setShowOnboarding]         = useState(false);

  const lastAddedTimeRef  = useRef<number>(0);
  const lastAddedValueRef = useRef<number | null>(null);

  // ── Onboarding check ──────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((val) => {
      if (!val) setShowOnboarding(true);
    });
  }, []);

  // ── Mirror WS status → connectionStatus ──────────────────────────────────
  useEffect(() => {
    if (wsStatus === 'connected') {
      setConnectionStatus({ isConnected: true, type: 'WiFi' });
    } else if (wsStatus === 'disconnected' || wsStatus === 'error') {
      setConnectionStatus({ isConnected: false, type: 'None' });
    }
  }, [wsStatus]);

  // ── Auto-add ESP32 readings ───────────────────────────────────────────────
  useEffect(() => {
    if (!latestData) return;

    const now     = Date.now();
    const elapsed = now - lastAddedTimeRef.current;
    const sameVal = latestData.iop === lastAddedValueRef.current;

    // Add reading if: value changed OR 30 s have passed since last add
    if (!sameVal || elapsed >= AUTO_ADD_INTERVAL_MS) {
      const newReading: IOPReading = {
        date:  new Date(),
        value: latestData.iop,
      };
      setReadings((prev) => [...prev, newReading]);
      lastAddedTimeRef.current  = now;
      lastAddedValueRef.current = latestData.iop;
    }
  }, [latestData]);

  // ── Manual reading from EyeScan ──────────────────────────────────────────
  const addReading = useCallback((newValue: number) => {
    setReadings((prev) => [...prev, { date: new Date(), value: newValue }]);
    setActiveScreen('dashboard');
  }, []);

  // ── Connection callbacks (from ConnectionManager) ────────────────────────
  const handleConnect = useCallback((type: ConnectionType) => {
    setConnectionStatus({ isConnected: true, type });
    setIsConnectionModalOpen(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnectionStatus({ isConnected: false, type: 'None' });
    setIsConnectionModalOpen(false);
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'scan':
        return <EyeScan onSave={addReading} />;
      case 'history':
        return <History readings={readings} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            readings={readings}
            connectionStatus={connectionStatus}
            onManageConnection={() => setIsConnectionModalOpen(true)}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <IrisBackground />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.content} edges={['top']}>
        <View style={styles.header}>
          <EyeIcon width={32} height={32} color="#67e8f9" />
          <Text style={styles.headerTitle}>EyeSee</Text>
        </View>
        <View style={styles.main}>{renderScreen()}</View>
        <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      </SafeAreaView>

      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      {isConnectionModalOpen && (
        <ConnectionManager
          isOpen={isConnectionModalOpen}
          onClose={() => setIsConnectionModalOpen(false)}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          currentStatus={connectionStatus}
        />
      )}
    </View>
  );
};

// ── Root app — provides ESP32 context ─────────────────────────────────────────
const App: React.FC = () => (
  <SafeAreaProvider>
    <ESP32Provider>
      <AppInner />
    </ESP32Provider>
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#67e8f9',
  },
  main: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default App;
```

---

## 5. Step-by-Step Setup

### A — Flash the ESP32

1. Open **Arduino IDE 2.x**
2. Go to **File → New Sketch**, paste the firmware code from Section 3
3. Set your WiFi credentials at the top (`WIFI_SSID`, `WIFI_PASSWORD`)
4. **Tools → Board → ESP32 Arduino → ESP32 Dev Module**  
   *(or whichever board variant you have)*
5. **Tools → Port** → select the COM port for your ESP32
6. Click **Upload** (→)
7. Open **Tools → Serial Monitor**, set baud to **115200**
8. After boot you will see:
   ```
   >>> ESP32 IP Address: 192.168.1.42
   ```
   **Write this IP down** — you will type it into the app.

### B — Run the Expo app

```bash
# In the project root
npx expo start
```

- Scan the QR code with **Expo Go** on your phone  
  *(both phone and ESP32 must be on the same WiFi)*

### C — Connect in the app

1. Open the app → tap **"Manage Connection"** on the Dashboard
2. Select the **WiFi** tab
3. Type the IP from Serial Monitor (e.g. `192.168.1.42`)
4. Tap **Connect**
5. The status badge should turn green: **Connected ✓**
6. Return to Dashboard — IOP values will update every ~2 seconds

---

## 6. Testing & Troubleshooting

### Quick WebSocket test (without the app)

Install `wscat` on your computer:
```bash
npm install -g wscat
wscat -c ws://192.168.1.42:81
```
You should see JSON messages arriving every 2 seconds.

### Common Issues

| Symptom | Fix |
|---|---|
| Serial Monitor shows `......` endlessly | Wrong SSID/password. Double-check `WIFI_SSID` and `WIFI_PASSWORD` |
| App shows "Connection error" immediately | Phone and ESP32 on different networks, or wrong IP |
| App connects but no readings appear | Check `onmessage` parsing — open Metro bundler console and look for `[ESP32]` logs |
| IOP reads 30.0 or 12.0 permanently | Calibrate `IR_RAW_MIN` / `IR_RAW_MAX` to your actual sensor range |
| Temperature reads 0.0 or 330.0 | Check LM35 wiring; verify `TEMP_PIN` matches your actual GPIO |
| IP changes after router restart | Set a **DHCP reservation** in your router for the ESP32's MAC address, or switch to a static IP in the sketch (`WiFi.config(...)`) |

### Setting a static IP on the ESP32 (optional but recommended)

Add this before `WiFi.begin(...)` in `setup()`:

```cpp
IPAddress staticIP(192, 168, 1, 100); // choose a free IP on your subnet
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
WiFi.config(staticIP, gateway, subnet);
```

This means the IP will never change and the app will always auto-connect
without re-entering it.

---

## Summary of File Changes

| File | Action |
|---|---|
| `esp32/sketch.ino` | **Create** — flash to ESP32 |
| `types.ts` | **Modify** — add `ESP32Data`, `WSStatus` |
| `services/esp32Service.ts` | **Create** — WebSocket client hook + context |
| `components/ConnectionManager.tsx` | **Replace** — real IP input, live status |
| `App.tsx` | **Replace** — add `ESP32Provider`, auto-add readings |

No new npm packages are required. React Native's built-in `WebSocket` API
handles all communication.
