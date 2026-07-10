import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export const EyeIcon: React.FC<IconProps> = ({ width = 24, height = 24, color = '#ffffff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <Circle cx={12} cy={12} r={3} />
  </Svg>
);
