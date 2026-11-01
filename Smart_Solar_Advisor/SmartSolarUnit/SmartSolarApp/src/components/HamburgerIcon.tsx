import React from 'react';
import { View, StyleSheet } from 'react-native';
interface HamburgerIconProps {
  size?: number;
  color?: string;
}

export default function HamburgerIcon({ size = 24, color = '#FFFFFF' }: HamburgerIconProps) {
  const lineWidth = size * 0.7;
  const lineHeight = 2;
  const lineSpacing = size * 0.25;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.line, { width: lineWidth, height: lineHeight, backgroundColor: color }]} />
      <View style={[styles.line, { width: lineWidth, height: lineHeight, backgroundColor: color, marginTop: lineSpacing }]} />
      <View style={[styles.line, { width: lineWidth, height: lineHeight, backgroundColor: color, marginTop: lineSpacing }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  line: {
    borderRadius: 1,
  },
});

