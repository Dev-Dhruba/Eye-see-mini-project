import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import Svg, { Circle } from 'react-native-svg';
import type { SensorReading } from '../types';
import { uploadScanImage } from '../services/storage';
import { analyzeFundusImage, type ModelResult } from '../services/gradioModel';
import { saveScanResult } from '../services/scanResults';

interface EyeScanProps {
  onSave?: (value: number) => void;
  userId?: number | null;
}

type Stage = 'idle' | 'capturing' | 'uploading' | 'analyzing' | 'saving' | 'done';

const STAGE_LABEL: Record<Exclude<Stage, 'idle' | 'done'>, string> = {
  capturing: 'Capturing image…',
  uploading: 'Uploading image…',
  analyzing: 'Analysing with AI model…',
  saving: 'Saving result…',
};

const EyeScan: React.FC<EyeScanProps> = ({ userId }) => {
  const [stage, setStage] = useState<Stage>('idle');
  const [model, setModel] = useState<ModelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Placeholder live sensor values — wired to the ESP32 backend later.
  const [sensors] = useState<SensorReading>({
    temperature: null,
    humidity: null,
    ir: null,
  });

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  const busy = stage !== 'idle' && stage !== 'done';

  const handleCaptureAnalyse = async () => {
    setError(null);
    setModel(null);

    // 1. Capture a real photo from the camera.
    setStage('capturing');
    let uri: string | undefined;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      uri = photo?.uri;
    } catch {
      // fall through to the null check below
    }
    if (!uri) {
      setError('Could not capture an image. Try again.');
      setStage('idle');
      return;
    }

    // 2. Upload the image to the Supabase bucket (for our own records).
    setStage('uploading');
    const upload = await uploadScanImage(uri, userId);
    if (upload.error) {
      setError(`Image upload failed: ${upload.error}`);
      setStage('idle');
      return;
    }

    // 3. Send the image to the Hugging Face model and parse its report.
    setStage('analyzing');
    const analysis = await analyzeFundusImage(uri);
    if (analysis.error || !analysis.data) {
      setError(`Analysis failed: ${analysis.error ?? 'unknown error'}`);
      setStage('idle');
      return;
    }
    setModel(analysis.data);

    // 4. Store the model output in the database.
    setStage('saving');
    const saved = await saveScanResult({
      userId,
      imagePath: upload.data?.path,
      imageUrl: upload.data?.publicUrl,
      model: analysis.data,
    });
    if (saved.error) {
      // The analysis still succeeded; surface the save problem but keep the report.
      setError(`Saved to model but DB write failed: ${saved.error}`);
    }

    setStage('done');
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  const irLabel = sensors.ir === 0 ? 'DETECTED' : sensors.ir === 1 ? 'CLEAR' : '—';
  const irColor = sensors.ir === 0 ? '#D97706' : sensors.ir === 1 ? '#0891B2' : '#94A3B8';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Scanner */}
      <View style={styles.scannerWrap}>
        <View style={styles.cameraCircle}>
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={[styles.camera, facing === 'front' && styles.cameraMirrored]}
              facing={facing}
            />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.cameraPlaceholderText}>
                Camera permission needed to scan
              </Text>
            </View>
          )}
        </View>

        {/* Flip camera button */}
        {permission?.granted && !busy && (
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleFacing}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={13} r={3.2} stroke="#FFFFFF" strokeWidth={1.8} />
              <Circle
                cx={12}
                cy={13}
                r={8}
                stroke="#FFFFFF"
                strokeWidth={1.8}
                strokeDasharray="4 3"
              />
            </Svg>
          </TouchableOpacity>
        )}
      </View>

      {/* Status line */}
      <Text style={styles.statusText}>
        {busy
          ? STAGE_LABEL[stage as Exclude<Stage, 'idle' | 'done'>]
          : stage === 'done'
          ? 'Analysis complete'
          : 'Center the fundus image in the circle'}
      </Text>

      {/* Capture & Analyse Button */}
      <TouchableOpacity
        style={[styles.primaryButton, busy && styles.buttonDisabled]}
        onPress={handleCaptureAnalyse}
        activeOpacity={0.8}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {stage === 'done' ? 'Capture & Analyse Again' : 'Capture & Analyse'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Model Result */}
      {model && (
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Clinical Report</Text>
            {!!model.status && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{model.status}</Text>
              </View>
            )}
          </View>
          <Text style={styles.reportBody}>{model.report}</Text>
        </View>
      )}

      {/* Sensor Data */}
      <Text style={styles.sectionTitle}>Sensor Data</Text>
      <View style={styles.sensorGrid}>
        <View style={styles.sensorCard}>
          <Text style={styles.sensorLabel}>Temperature</Text>
          <Text style={styles.sensorValue}>
            {sensors.temperature !== null ? sensors.temperature.toFixed(1) : '—'}
            <Text style={styles.sensorUnit}> °C</Text>
          </Text>
        </View>
        <View style={styles.sensorCard}>
          <Text style={styles.sensorLabel}>Humidity</Text>
          <Text style={styles.sensorValue}>
            {sensors.humidity !== null ? sensors.humidity.toFixed(1) : '—'}
            <Text style={styles.sensorUnit}> %</Text>
          </Text>
        </View>
        <View style={styles.sensorCard}>
          <Text style={styles.sensorLabel}>IR Sensor</Text>
          <Text style={[styles.sensorValue, { color: irColor }]}>{irLabel}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 18,
  },

  // Scanner
  scannerWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#0891B2',
    backgroundColor: '#F1F5F9',
  },
  camera: {
    flex: 1,
  },
  cameraMirrored: {
    transform: [{ scaleX: -1 }],
  },
  flipButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0891B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cameraPlaceholderText: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 13,
  },

  // Status
  statusText: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Report card
  reportCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  statusBadge: {
    backgroundColor: '#ECFEFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  statusBadgeText: {
    color: '#0E7490',
    fontSize: 11,
    fontWeight: '600',
  },
  reportBody: {
    color: '#1F2937',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },

  // Capture button
  primaryButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    backgroundColor: '#0891B2',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 50,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Sensor section
  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    letterSpacing: -0.1,
  },
  sensorGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  sensorCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  sensorLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sensorUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
});

export default EyeScan;
