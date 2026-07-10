import type { IOPReading } from './types';

const generatePastDate = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

export const initialReadings: IOPReading[] = [
  { date: generatePastDate(14), value: 18 },
  { date: generatePastDate(12), value: 19 },
  { date: generatePastDate(10), value: 18 },
  { date: generatePastDate(7), value: 20 },
  { date: generatePastDate(5), value: 21 },
  { date: generatePastDate(3), value: 20 },
  { date: generatePastDate(1), value: 22 },
];

export const NORMAL_IOP_RANGE = { min: 12, max: 22 };
export const MODERATE_RISK_THRESHOLD = 24;
export const HIGH_RISK_THRESHOLD = 27;

export const NEON_BLUE = '#00BFFF';

export const SENSOR_POLL_INTERVAL_MS = 3000;
export const ESP32_ENDPOINTS = {
  DHT: '/dht11',
  IR: '/irsensor',
};
