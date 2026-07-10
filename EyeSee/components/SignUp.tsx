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
import { isUsernameTaken } from '../services/auth';

interface SignUpProps {
  onCredentialsReady: (username: string, password: string) => void;
  onNavigateToSignIn: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onCredentialsReady, onNavigateToSignIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let valid = true;
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!username.trim()) {
      setUsernameError('Username is required.');
      valid = false;
    } else if (username.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      valid = false;
    }

    return valid;
  };

  const handleContinue = async () => {
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const taken = await isUsernameTaken(username.trim());
      if (taken) {
        setUsernameError('That username is already taken.');
        return;
      }
      onCredentialsReady(username.trim(), password);
    } catch (e: any) {
      setFormError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (): { label: string; color: string; width: string } => {
    if (!password) return { label: '', color: 'transparent', width: '0%' };
    if (password.length < 6) return { label: 'Weak', color: '#DC2626', width: '25%' };
    if (password.length < 8) return { label: 'Fair', color: '#EA580C', width: '50%' };
    if (password.length < 12 || !/[!@#$%^&*]/.test(password))
      return { label: 'Good', color: '#D97706', width: '75%' };
    return { label: 'Strong', color: '#059669', width: '100%' };
  };

  const strength = getPasswordStrength();

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
        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>
          Choose a username and password to get started
        </Text>

        {/* Card */}
        <View style={styles.card}>
          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={[styles.inputWrapper, usernameError ? styles.inputError : null]}>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (usernameError) setUsernameError('');
                }}
              />
            </View>
            {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, passwordError ? styles.inputError : null]}>
              <TextInput
                style={styles.inputFlex}
                placeholder="Min. 8 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {/* Strength bar */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBarBg}>
                  <View
                    style={[
                      styles.strengthBarFill,
                      { width: strength.width as any, backgroundColor: strength.color },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrapper, confirmPasswordError ? styles.inputError : null]}>
              <TextInput
                style={styles.inputFlex}
                placeholder="Re-enter your password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={styles.eyeToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.toggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}
          </View>

          {/* Form-level error */}
          {formError ? (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Navigate to Sign In */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={onNavigateToSignIn} activeOpacity={0.7}>
            <Text style={styles.switchLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
    gap: 14,
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
  inputFlex: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeToggle: {
    paddingLeft: 8,
  },
  toggleText: {
    fontSize: 13,
    color: '#0891B2',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
  },

  // Password strength
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'right',
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

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Switch auth
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    color: '#64748B',
    fontSize: 14,
  },
  switchLink: {
    color: '#0891B2',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignUp;
