import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Screen } from '../types';
import { DashboardIcon } from './icons/DashboardIcon';
import { ScanIcon } from './icons/ScanIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { WifiIcon } from './icons/WifiIcon';

interface BottomNavProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

const NavItem: React.FC<{
  label: string;
  screen: Screen;
  icon: React.ReactNode;
  isActive: boolean;
  onPress: (screen: Screen) => void;
}> = ({ label, screen, icon, isActive, onPress }) => {
  return (
    <TouchableOpacity style={styles.navItem} onPress={() => onPress(screen)} activeOpacity={0.7}>
      {icon}
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
      {isActive && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
};

const ACTIVE = '#0891B2';
const INACTIVE = '#94A3B8';

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen }) => {
  return (
    <View style={styles.nav}>
      <NavItem
        label="Dashboard"
        screen="dashboard"
        icon={<DashboardIcon width={22} height={22} color={activeScreen === 'dashboard' ? ACTIVE : INACTIVE} />}
        isActive={activeScreen === 'dashboard'}
        onPress={setActiveScreen}
      />
      <NavItem
        label="Scan"
        screen="scan"
        icon={<ScanIcon width={22} height={22} color={activeScreen === 'scan' ? ACTIVE : INACTIVE} />}
        isActive={activeScreen === 'scan'}
        onPress={setActiveScreen}
      />
      <NavItem
        label="History"
        screen="history"
        icon={<HistoryIcon width={22} height={22} color={activeScreen === 'history' ? ACTIVE : INACTIVE} />}
        isActive={activeScreen === 'history'}
        onPress={setActiveScreen}
      />
      <NavItem
        label="Sensors"
        screen="sensors"
        icon={<WifiIcon width={22} height={22} color={activeScreen === 'sensors' ? ACTIVE : INACTIVE} />}
        isActive={activeScreen === 'sensors'}
        onPress={setActiveScreen}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    color: INACTIVE,
    fontWeight: '500',
  },
  navLabelActive: {
    color: ACTIVE,
    fontWeight: '600',
  },
  activeIndicator: {
    width: 28,
    height: 3,
    backgroundColor: ACTIVE,
    borderRadius: 2,
    marginTop: 4,
  },
});

export default BottomNav;
