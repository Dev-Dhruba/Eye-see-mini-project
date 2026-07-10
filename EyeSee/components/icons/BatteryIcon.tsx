import React from 'react';
import Svg, { Rect, Line } from 'react-native-svg';

interface BatteryIconProps {
  width?: number;
  height?: number;
  color?: string;
  charge: number;
}

export const BatteryIcon: React.FC<BatteryIconProps> = ({ width = 24, height = 24, color = '#ffffff', charge }) => {
  const chargeWidth = Math.max(0, Math.min(18, (18 * charge) / 100));
  const chargeColor = charge > 20 ? color : '#ef4444';

  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={6} width={18} height={12} rx={2} ry={2} />
      <Line x1={22} y1={10} x2={22} y2={14} />
      <Rect x={4} y={8} width={chargeWidth} height={8} rx={1} ry={1} fill={chargeColor} stroke="none" />
    </Svg>
  );
};
