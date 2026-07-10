import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export const ScanIcon: React.FC<IconProps> = ({ width = 24, height = 24, color = '#ffffff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <Circle cx={12} cy={12} r={1} />
    <Path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
  </Svg>
);
