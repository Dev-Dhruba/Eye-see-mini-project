import React from 'react';
import Svg, { Path, Polyline, Line } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export const DownloadIcon: React.FC<IconProps> = ({ width = 24, height = 24, color = '#ffffff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="7 10 12 15 17 10" />
    <Line x1={12} y1={15} x2={12} y2={3} />
  </Svg>
);
