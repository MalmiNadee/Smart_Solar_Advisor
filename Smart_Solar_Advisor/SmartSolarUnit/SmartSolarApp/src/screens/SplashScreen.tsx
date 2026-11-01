import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Image } from 'react-native';

const logoImage = require('../assets/Logo.png');
const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { colors } = useTheme();
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo animation: scale up and fade in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Text animation: fade in and slide up
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate progress bar width
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    // Complete splash screen after animation
    const timer = setTimeout(() => {
      onFinish();
    }, 2800);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const progressBarWidth = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Logo with animation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <Image 
              source={logoImage} 
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* App Name with animation */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={[styles.appName, { color: colors.white }]}>Smart Solar Advisor</Text>
          <Text style={[styles.tagline, { color: colors.gray }]}>Monitor your solar installation</Text>
        </Animated.View>

        {/* Loading Bar */}
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingBarBackground, { backgroundColor: colors.white + '40' }]}>
            <Animated.View
              style={[
                styles.loadingBarFill,
                {
                  width: progressBarWidth,
                  backgroundColor: colors.solarOrange,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoWrapper: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    width: width * 0.6,
    marginTop: 40,
  },
  loadingBarBackground: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

