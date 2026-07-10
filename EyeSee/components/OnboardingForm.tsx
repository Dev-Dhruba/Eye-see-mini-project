import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { EyeIcon } from './icons/EyeIcon';
import { signUpUser, saveCurrentUser, type AppUser } from '../services/auth';

interface OnboardingFormProps {
  username: string;
  password: string;
  onComplete: (user: AppUser) => void;
  onBack: () => void;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const OnboardingForm: React.FC<OnboardingFormProps> = ({
  username,
  password,
  onComplete,
  onBack,
}) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');
  const [genderError, setGenderError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let valid = true;
    setNameError('');
    setAgeError('');
    setGenderError('');

    if (!name.trim()) {
      setNameError('Name is required.');
      valid = false;
    }

    const ageNum = Number(age);
    if (!age.trim()) {
      setAgeError('Age is required.');
      valid = false;
    } else if (!Number.isInteger(ageNum) || ageNum <= 0 || ageNum > 120) {
      setAgeError('Enter a valid age.');
      valid = false;
    }

    if (!gender) {
      setGenderError('Please select a gender.');
      valid = false;
    }

    return valid;
  };

  const handleFinish = async () => {
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    const { user, error } = await signUpUser({
      username,
      password,
      name: name.trim(),
      age: Number(age),
      gender,
    });
    setLoading(false);

    if (error || !user) {
      setFormError(error ?? 'Could not create your account. Please try again.');
      return;
    }

    await saveCurrentUser(user);
    onComplete(user);
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <EyeIcon width={36} height={36} color="#0891B2" />
          <Text style={styles.appName}>EyeSee</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Tell us about you</Text>
        <Text style={styles.subheading}>
          A few details to personalize your eye health profile
        </Text>

        {/* Card */}
        <View style={styles.card}>
          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrapper, nameError ? styles.inputError : null]}>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoCorrect={false}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError('');
                }}
              />
            </View>
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          {/* Age */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Age</Text>
            <View style={[styles.inputWrapper, ageError ? styles.inputError : null]}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 28"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={age}
                onChangeText={(text) => {
                  setAge(text.replace(/[^0-9]/g, ''));
                  if (ageError) setAgeError('');
                }}
                maxLength={3}
              />
            </View>
            {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}
          </View>

          {/* Gender */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((option) => {
                const selected = gender === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.genderChip, selected && styles.genderChipSelected]}
                    onPress={() => {
                      setGender(option);
                      if (genderError) setGenderError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderText, selected && styles.genderTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {genderError ? <Text style={styles.errorText}>{genderError}</Text> : null}
          </View>

          {/* Form-level error */}
          {formError ? (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Finish Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleFinish}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Back */}
        <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
  },

  // Headings
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 22,
    gap: 16,
  },

  // Fields
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
  },

  // Gender chips
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  genderChipSelected: {
    borderColor: '#0891B2',
    backgroundColor: '#ECFEFF',
  },
  genderText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  genderTextSelected: {
    color: '#0E7490',
  },

  // Form-level error
  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  formErrorText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
  },

  // Primary button
  primaryButton: {
    backgroundColor: '#0891B2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 2,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },

  // Back
  backRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OnboardingForm;
