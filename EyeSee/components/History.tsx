import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import type { IOPReading } from '../types';
import { NEON_BLUE } from '../constants';
import { getAIInsight } from '../services/geminiService';
import { generatePDFReport } from '../utils/pdfGenerator';
import { SparklesIcon } from './icons/SparklesIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface HistoryProps {
  readings: IOPReading[];
}

const screenWidth = Dimensions.get('window').width;

const History: React.FC<HistoryProps> = ({ readings }) => {
  const [insight, setInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const handleGetInsight = async () => {
    setIsLoadingInsight(true);
    const result = await getAIInsight(readings);
    setInsight(result);
    setIsLoadingInsight(false);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingPDF(true);
    try {
      await generatePDFReport(readings, insight);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      Alert.alert('Error', 'Could not generate PDF report. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const chartLabels = readings.map((r) =>
    r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const chartValues = readings.map((r) => r.value);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Chart Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Readings History</Text>
        {chartValues.length > 0 ? (
          <BarChart
            data={{
              labels: chartLabels,
              datasets: [{ data: chartValues }],
            }}
            width={screenWidth - 64}
            height={250}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
              barPercentage: 0.6,
              propsForBackgroundLines: {
                strokeDasharray: '3 3',
                stroke: '#E2E8F0',
              },
            }}
            style={styles.chart}
            withInnerLines
            showValuesOnTopOfBars
            fromZero={false}
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <Text style={styles.noDataText}>No readings yet</Text>
        )}
      </View>

      {/* AI Insight Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI-Driven Insight</Text>
        {insight && !isLoadingInsight ? (
          <Text style={styles.insightText}>"{insight}"</Text>
        ) : null}
        {isLoadingInsight ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#0891B2" />
            <Text style={styles.loadingText}>Generating analysis...</Text>
          </View>
        ) : null}
        {!insight && !isLoadingInsight ? (
          <Text style={styles.placeholderText}>Press the button to analyze your pressure trends.</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.insightButton, (isLoadingInsight || isGeneratingPDF) && styles.buttonDisabled]}
          onPress={handleGetInsight}
          disabled={isLoadingInsight || isGeneratingPDF}
          activeOpacity={0.7}
        >
          <SparklesIcon width={18} height={18} color={isLoadingInsight || isGeneratingPDF ? '#94A3B8' : '#FFFFFF'} />
          <Text style={[styles.insightButtonText, (isLoadingInsight || isGeneratingPDF) && styles.buttonTextDisabled]}>
            {isLoadingInsight ? 'Analyzing...' : 'Get AI Insight'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Report Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shareable Report</Text>
        <Text style={styles.placeholderText}>
          Generate a PDF report of your history and insights to share with your doctor.
        </Text>
        <TouchableOpacity
          style={[styles.reportButton, (isGeneratingPDF || isLoadingInsight || readings.length === 0) && styles.buttonDisabled]}
          onPress={handleGenerateReport}
          disabled={isGeneratingPDF || isLoadingInsight || readings.length === 0}
          activeOpacity={0.7}
        >
          <DownloadIcon
            width={18}
            height={18}
            color={isGeneratingPDF || isLoadingInsight || readings.length === 0 ? '#94A3B8' : '#0E7490'}
          />
          <Text
            style={[
              styles.reportButtonText,
              (isGeneratingPDF || isLoadingInsight || readings.length === 0) && styles.buttonTextDisabled,
            ]}
          >
            {isGeneratingPDF ? 'Generating...' : 'Generate Report'}
          </Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  chart: {
    borderRadius: 12,
    marginTop: 4,
    marginLeft: -8,
  },
  noDataText: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 40,
  },
  insightText: {
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 22,
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  insightButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#0891B2',
    borderRadius: 10,
    gap: 8,
  },
  insightButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  reportButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#ECFEFF',
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  reportButtonText: {
    color: '#0E7490',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  buttonTextDisabled: {
    color: '#94A3B8',
  },
});

export default History;
