import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import type { IOPReading, ConnectionStatus } from '../types';
import { RiskLevel } from '../types';
import { NORMAL_IOP_RANGE, MODERATE_RISK_THRESHOLD, HIGH_RISK_THRESHOLD } from '../constants';
import { WifiIcon } from './icons/WifiIcon';
import { BatteryIcon } from './icons/BatteryIcon';
import { BluetoothIcon } from './icons/BluetoothIcon';

interface DashboardProps {
  readings: IOPReading[];
  connectionStatus: ConnectionStatus;
  onManageConnection: () => void;
  userName?: string | null;
}

const getRiskLevel = (value: number): RiskLevel => {
  if (value >= HIGH_RISK_THRESHOLD) return RiskLevel.High;
  if (value >= MODERATE_RISK_THRESHOLD) return RiskLevel.Moderate;
  return RiskLevel.Low;
};

const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case RiskLevel.High:
      return '#DC2626';
    case RiskLevel.Moderate:
      return '#D97706';
    case RiskLevel.Low:
      return '#059669';
    default:
      return '#64748B';
  }
};

const screenWidth = Dimensions.get('window').width;

const Dashboard: React.FC<DashboardProps> = ({
  readings,
  connectionStatus,
  onManageConnection,
  userName,
}) => {
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;
  const riskLevel = latestReading ? getRiskLevel(latestReading.value) : RiskLevel.Low;

  const last7 = readings.slice(-7);
  const chartLabels = last7.map((r) =>
    r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const chartValues = last7.map((r) => r.value);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Greeting */}
      <Text style={styles.greeting}>Hello, {userName?.trim() || 'there'}</Text>

      {/* Device Status Card */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.cardTitle}>EyeSee Monitor</Text>
            <Text style={[styles.statusText, connectionStatus.isConnected ? styles.connected : styles.disconnected]}>
              {connectionStatus.isConnected ? `Connected via ${connectionStatus.type}` : 'Disconnected'}
            </Text>
          </View>
          <View style={styles.iconRow}>
            {connectionStatus.isConnected && connectionStatus.type === 'WiFi' && (
              <WifiIcon width={22} height={22} color="#0891B2" />
            )}
            {connectionStatus.isConnected && connectionStatus.type === 'Bluetooth' && (
              <BluetoothIcon width={22} height={22} color="#0891B2" />
            )}
            <BatteryIcon width={22} height={22} color="#0891B2" charge={90} />
          </View>
        </View>
        <TouchableOpacity style={styles.manageButton} onPress={onManageConnection} activeOpacity={0.7}>
          <Text style={styles.manageButtonText}>Manage Connection</Text>
        </TouchableOpacity>
      </View>

      {/* Main Reading Card */}
      <View style={styles.readingCard}>
        <Text style={styles.readingLabel}>Last Reading (IOP)</Text>
        <View style={styles.readingRow}>
          <Text style={styles.readingValue}>{latestReading ? latestReading.value.toFixed(1) : '--'}</Text>
          <Text style={styles.readingUnit}>mmHg</Text>
        </View>
        <Text style={[styles.riskText, { color: getRiskColor(riskLevel) }]}>{riskLevel} Risk</Text>
        <Text style={styles.readingDate}>
          {latestReading ? `Recorded on ${latestReading.date.toLocaleDateString()}` : 'No readings yet'}
        </Text>
      </View>

      {/* Trend Graph Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>7-Day Trend</Text>
        {chartValues.length > 0 ? (
          <LineChart
            data={{
              labels: chartLabels,
              datasets: [{ data: chartValues }],
            }}
            width={screenWidth - 64}
            height={200}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#0891B2',
              },
              fillShadowGradientFrom: '#0891B2',
              fillShadowGradientFromOpacity: 0.18,
              fillShadowGradientTo: '#0891B2',
              fillShadowGradientToOpacity: 0,
              propsForBackgroundLines: {
                strokeDasharray: '3 3',
                stroke: '#E2E8F0',
              },
            }}
            bezier
            style={styles.chart}
            withInnerLines
            withOuterLines={false}
          />
        ) : (
          <Text style={styles.noDataText}>No data yet</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  connected: {
    color: '#059669',
  },
  disconnected: {
    color: '#64748B',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manageButton: {
    marginTop: 16,
    backgroundColor: '#ECFEFF',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  manageButtonText: {
    color: '#0E7490',
    fontWeight: '600',
    fontSize: 14,
  },
  readingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readingLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  readingValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -1.5,
  },
  readingUnit: {
    fontSize: 18,
    color: '#64748B',
    marginLeft: 8,
    fontWeight: '500',
  },
  riskText: {
    fontWeight: '600',
    fontSize: 15,
  },
  readingDate: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  chart: {
    borderRadius: 12,
    marginTop: 8,
    marginLeft: -8,
  },
  noDataText: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default Dashboard;
