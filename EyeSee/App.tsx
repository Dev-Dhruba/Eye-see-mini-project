import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IOPReading, Screen, ConnectionStatus, ConnectionType, AuthScreen } from './types';
import { initialReadings } from './constants';

import Dashboard from './components/Dashboard';
import EyeScan from './components/EyeScan';
import History from './components/History';
import SensorData from './components/SensorData';
import BottomNav from './components/BottomNav';
import { EyeIcon } from './components/icons/EyeIcon';
import ConnectionManager from './components/ConnectionManager';
import Onboarding from './components/Onboarding';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import OnboardingForm from './components/OnboardingForm';
import { loadCurrentUser, clearCurrentUser, type AppUser } from './services/auth';

const App: React.FC = () => {
  const [readings, setReadings] = useState<IOPReading[]>(initialReadings);
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: true,
    type: 'WiFi',
  });
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ── Auth state ────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('signin');
  const [pendingCredentials, setPendingCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    // Restore any locally persisted user on launch.
    loadCurrentUser().then((user) => {
      setCurrentUser(user);
      setAuthChecked(true);
    });
  }, []);

  const handleAuthenticated = useCallback((user: AppUser) => {
    setCurrentUser(user);
    setPendingCredentials(null);
    setAuthScreen('signin');
  }, []);

  const handleCredentialsReady = useCallback((username: string, password: string) => {
    setPendingCredentials({ username, password });
    setAuthScreen('onboarding');
  }, []);

  const handleSignOut = useCallback(async () => {
    await clearCurrentUser();
    setCurrentUser(null);
    setAuthScreen('signin');
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const checkOnboarding = async () => {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const addReading = useCallback((newValue: number) => {
    const newReading: IOPReading = {
      date: new Date(),
      value: newValue,
    };
    setReadings((prevReadings) => [...prevReadings, newReading]);
    setActiveScreen('dashboard');
  }, []);

  const handleConnect = (type: ConnectionType) => {
    setConnectionStatus({ isConnected: true, type });
    setIsConnectionModalOpen(false);
  };

  const handleDisconnect = () => {
    setConnectionStatus({ isConnected: false, type: 'None' });
    setIsConnectionModalOpen(false);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'scan':
        return <EyeScan onSave={addReading} userId={currentUser?.id} />;
      case 'history':
        return <History readings={readings} />;
      case 'sensors':
        return <SensorData />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            readings={readings}
            connectionStatus={connectionStatus}
            onManageConnection={() => setIsConnectionModalOpen(true)}
            userName={currentUser?.name}
          />
        );
    }
  };

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <SafeAreaProvider>
        <View style={[styles.container, styles.splash]}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color="#0891B2" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
            {authScreen === 'signin' && (
              <SignIn
                onSignIn={handleAuthenticated}
                onNavigateToSignUp={() => setAuthScreen('signup')}
              />
            )}
            {authScreen === 'signup' && (
              <SignUp
                onCredentialsReady={handleCredentialsReady}
                onNavigateToSignIn={() => setAuthScreen('signin')}
              />
            )}
            {authScreen === 'onboarding' && pendingCredentials && (
              <OnboardingForm
                username={pendingCredentials.username}
                password={pendingCredentials.password}
                onComplete={handleAuthenticated}
                onBack={() => setAuthScreen('signup')}
              />
            )}
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.content} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerBrand}>
              <EyeIcon width={28} height={28} color="#0891B2" />
              <Text style={styles.headerTitle}>EyeSee</Text>
            </View>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
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
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  splash: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  signOutButton: {
    position: 'absolute',
    right: 16,
  },
  signOutText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  main: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
});

export default App;
