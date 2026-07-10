import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export const SparklesIcon: React.FC<IconProps> = ({ width = 24, height = 24, color = '#ffffff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9.93 2.65a2.5 2.5 0 0 1 4.14 0l.98 1.61a2.5 2.5 0 0 0 2.37 1.44l1.79.09a2.5 2.5 0 0 1 2.71 3.51l-.54 1.7a2.5 2.5 0 0 0 .7 2.65l1.24 1.24a2.5 2.5 0 0 1-1.42 4.24l-1.72.31a2.5 2.5 0 0 0-2.07 2.07l-.31 1.72a2.5 2.5 0 0 1-4.24-1.42l-1.24-1.24a2.5 2.5 0 0 0-2.65-.7l-1.7.54a2.5 2.5 0 0 1-3.51-2.71l-.09-1.79a2.5 2.5 0 0 0-1.44-2.37L2.65 9.93a2.5 2.5 0 0 1 0-4.14l1.61-.98a2.5 2.5 0 0 0 1.44-2.37l.09-1.79a2.5 2.5 0 0 1 3.51-2.71l1.7.54a2.5 2.5 0 0 0 2.65.7Z" />
  </Svg>
);
