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
import { signInUser, saveCurrentUser, type AppUser } from '../services/auth';

interface SignInProps {
  onSignIn: (user: AppUser) => void;
  onNavigateToSignUp: () => void;
}

const SignIn: React.FC<SignInProps> = ({ onSignIn, onNavigateToSignUp }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let valid = true;
    setUsernameError('');
    setPasswordError('');

    if (!username.trim()) {
      setUsernameError('Username is required.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    }

    return valid;
  };

  const handleSignIn = async () => {
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    const { user, error } = await signInUser(username.trim(), password);
    setLoading(false);

    if (error || !user) {
      setFormError(error ?? 'Unable to sign in.');
      return;
    }

    await saveCurrentUser(user);
    onSignIn(user);
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
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>Sign in to continue monitoring your eye health</Text>

        {/* Card */}
        <View style={styles.card}>
          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={[styles.inputWrapper, usernameError ? styles.inputError : null]}>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
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
                placeholder="Enter your password"
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
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {/* Form-level error */}
          {formError ? (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSignIn}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Navigate to Sign Up */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>New to EyeSee? </Text>
          <TouchableOpacity onPress={onNavigateToSignUp} activeOpacity={0.7}>
            <Text style={styles.switchLink}>Create an Account</Text>
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
    marginTop: 4,
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

export default SignIn;
