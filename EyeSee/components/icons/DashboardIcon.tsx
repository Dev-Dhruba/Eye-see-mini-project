import React from 'react';
import Svg, { Rect } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export const DashboardIcon: React.FC<IconProps> = ({ width = 24, height = 24, color = '#ffffff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect width={7} height={9} x={3} y={3} rx={1} />
    <Rect width={7} height={5} x={14} y={3} rx={1} />
    <Rect width={7} height={9} x={14} y={12} rx={1} />
    <Rect width={7} height={5} x={3} y={16} rx={1} />
  </Svg>
);
