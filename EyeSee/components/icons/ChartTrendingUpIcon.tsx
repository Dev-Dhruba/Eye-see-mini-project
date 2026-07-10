import React from 'react';
import Svg, { Polyline } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export const ChartTrendingUpIcon: React.FC<IconProps> = ({ width = 24, height = 24, color = '#ffffff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <Polyline points="16 7 22 7 22 13" />
  </Svg>
);
