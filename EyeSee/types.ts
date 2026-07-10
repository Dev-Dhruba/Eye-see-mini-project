export interface IOPReading {
  date: Date;
  value: number;
}

export type Screen = 'dashboard' | 'scan' | 'history' | 'sensors';

export type AuthScreen = 'signin' | 'signup' | 'onboarding';

export interface SensorReading {
  temperature: number | null;
  humidity: number | null;
  ir: 0 | 1 | null;
}

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
