import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { EyeIcon } from './icons/EyeIcon';
import { ChartTrendingUpIcon } from './icons/ChartTrendingUpIcon';
import { WifiIcon } from './icons/WifiIcon';
import { BluetoothIcon } from './icons/BluetoothIcon';

interface OnboardingProps {
  onComplete: () => void;
}

const onboardingSteps = [
  {
    icon: <EyeIcon width={64} height={64} color="#0891B2" />,
    title: 'Welcome to EyeSee',
    text: "Your personal companion for monitoring eye health. Let's get you started on the path to proactive care.",
  },
  {
    icon: <ChartTrendingUpIcon width={64} height={64} color="#0891B2" />,
    title: 'Proactive Eye Care',
    text: 'Regularly tracking your intraocular pressure (IOP) is key to early detection of conditions like glaucoma. Stay ahead with consistent monitoring.',
  },
  {
    icon: (
      <View style={{ flexDirection: 'row', gap: 24 }}>
        <WifiIcon width={48} height={48} color="#0891B2" />
        <BluetoothIcon width={48} height={48} color="#0891B2" />
      </View>
    ),
    title: 'Simple & Secure Connection',
    text: "Connect your EyeSee Monitor via Wi-Fi or Bluetooth to start taking measurements. It's quick, easy, and secure.",
  },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const currentStepData = onboardingSteps[step];
  const isLastStep = step === onboardingSteps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>{currentStepData.icon}</View>
        <Text style={styles.title}>{currentStepData.title}</Text>
        <Text style={styles.text}>{currentStepData.text}</Text>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === step ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          <View style={styles.navSide}>
            {step > 0 && (
              <TouchableOpacity onPress={handleBack}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.7}>
            <Text style={styles.nextButtonText}>{isLastStep ? 'Get Started' : 'Next'}</Text>
          </TouchableOpacity>
          <View style={styles.navSide} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 36,
    minWidth: 140,
    height: 140,
    borderRadius: 70,
    paddingHorizontal: 24,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  text: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  bottomSection: {
    paddingBottom: 40,
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#0891B2',
    width: 24,
  },
  dotInactive: {
    backgroundColor: '#CBD5E1',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navSide: {
    width: 80,
  },
  backText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  nextButton: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    backgroundColor: '#0891B2',
    borderRadius: 999,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});

export default Onboarding;
