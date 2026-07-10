import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';

const IrisBackground: React.FC = () => {
  const [time, setTime] = useState(0);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) * 0.4;
  const irisPulse = Math.sin(time * 0.6) * 1.5;
  const irisRadius = outerRadius * 0.95 + irisPulse;
  const pupilBaseRadius = irisRadius * 0.25;
  const pupilPulse = Math.sin(time * 0.5) * 2 + 2;
  const pupilRadius = pupilBaseRadius + pupilPulse;

  const lineCount = 60;
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;
    lines.push({
      x1: centerX + pupilRadius * Math.cos(angle),
      y1: centerY + pupilRadius * Math.sin(angle),
      x2: centerX + irisRadius * Math.cos(angle),
      y2: centerY + irisRadius * Math.sin(angle),
    });
  }

  return (
    <Svg style={styles.canvas} width={width} height={height}>
      <Defs>
        <RadialGradient
          id="irisGradient"
          cx={centerX.toString()}
          cy={centerY.toString()}
          rx={irisRadius.toString()}
          ry={irisRadius.toString()}
          fx={centerX.toString()}
          fy={centerY.toString()}
        >
          <Stop offset="0" stopColor="#22d3ee" />
          <Stop offset="0.5" stopColor="#0891b2" />
          <Stop offset="1" stopColor="#0e2940" />
        </RadialGradient>
      </Defs>

      {/* Outer ring */}
      <Circle
        cx={centerX}
        cy={centerY}
        r={outerRadius}
        stroke={`rgba(34, 211, 238, ${(0.5 + Math.sin(time * 0.7) * 0.2).toFixed(2)})`}
        strokeWidth={1}
        fill="none"
      />

      {/* Iris fill */}
      <Circle cx={centerX} cy={centerY} r={irisRadius} fill="url(#irisGradient)" />

      {/* Radial lines */}
      {lines.map((line, i) => (
        <Line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(14, 116, 144, 0.4)"
          strokeWidth={0.5}
        />
      ))}

      {/* Pupil */}
      <Circle cx={centerX} cy={centerY} r={pupilRadius} fill="#020617" />

      {/* Pupil highlight */}
      <Circle
        cx={centerX - pupilRadius * 0.2}
        cy={centerY - pupilRadius * 0.2}
        r={pupilRadius * 0.3}
        fill="rgba(255, 255, 255, 0.1)"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
});

export default IrisBackground;
