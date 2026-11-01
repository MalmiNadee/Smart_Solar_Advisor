import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, MapPin, LogOut, X, Settings } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import HamburgerIcon from '../components/HamburgerIcon';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { databaseService } from '../services/database';

const logoImage = require('../assets/Logo.png');

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { openSidebar, closeSidebar, isOpen } = useSidebar();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const slideAnim = React.useRef(new Animated.Value(isDark ? 1 : 0)).current;

  const loadProfilePicture = async () => {
    if (user?.id) {
      const picture = await databaseService.getProfilePicture(user.id);
      setProfilePicture(picture);
    }
  };

  useEffect(() => {
    loadProfilePicture();
  }, [user]);

  // Reload profile picture when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfilePicture();
    }, [user])
  );

  // Animate slider when theme changes
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: false, // Must be false for percentage transforms
      tension: 100,
      friction: 8,
    }).start();
  }, [isDark]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={logoImage} 
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <Text style={[styles.title, { color: theme.colors.white }]}>Profile</Text>
        <TouchableOpacity onPress={isOpen ? closeSidebar : openSidebar} style={styles.menuButton}>
          {isOpen ? (
            <X size={24} color={theme.colors.white} />
          ) : (
            <HamburgerIcon size={24} color={theme.colors.white} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {profilePicture ? (
            <Image 
              source={{ uri: profilePicture }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <User size={48} color={theme.colors.white} />
            </View>
          )}
          <Text style={[styles.name, { color: theme.colors.text }]}>{user.customerName || user.email}</Text>
          <Text style={[styles.role, { color: theme.colors.textSecondary }]}>Solar System Owner</Text>
        </View>

        {/* Settings Button */}
        <TouchableOpacity 
          style={[styles.settingsButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} 
          onPress={handleSettingsPress}
        >
          <Settings size={20} color={theme.colors.solarOrange} />
          <Text style={[styles.settingsText, { color: theme.colors.text }]}>Settings</Text>
        </TouchableOpacity>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.lightGray }]}>
              <Mail size={20} color={theme.colors.solarOrange} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user.email}</Text>
            </View>
          </View>
          {user.customerName && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.infoRow}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.lightGray }]}>
                  <MapPin size={20} color={theme.colors.solarOrange} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Customer Name</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user.customerName}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Theme Toggle Section */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.themeLabel, { color: theme.colors.textSecondary }]}>Theme</Text>
          <TouchableOpacity 
            style={[styles.themeToggle, { backgroundColor: isDark ? theme.colors.primary : theme.colors.lightGray }]}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <View style={styles.themeToggleContent}>
              <View style={styles.themeOption}>
                <Text style={styles.themeEmoji}>☀️</Text>
                <Text style={[styles.themeOptionText, { color: !isDark ? theme.colors.text : theme.colors.textSecondary }]}>
                  Light
                </Text>
              </View>
              <View style={styles.themeOption}>
                <Text style={styles.themeEmoji}>🌙</Text>
                <Text style={[styles.themeOptionText, { color: isDark ? theme.colors.text : theme.colors.textSecondary }]}>
                  Dark
                </Text>
              </View>
            </View>
            <Animated.View 
              style={[
                styles.themeToggleSlider, 
                { 
                  backgroundColor: isDark ? theme.colors.card : theme.colors.white,
                  transform: [{
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '52%'],
                    })
                  }]
                }
              ]} 
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.danger }]} 
          onPress={handleLogout}
        >
          <LogOut size={20} color={theme.colors.danger} />
          <Text style={[styles.logoutText, { color: theme.colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  menuButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  settingsText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  themeLabel: {
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '600' as const,
  },
  themeToggle: {
    height: 56,
    borderRadius: 28,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  themeToggleContent: {
    flexDirection: 'row',
    height: '100%',
    zIndex: 2,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 24,
    zIndex: 2,
  },
  themeOptionActive: {
    // Active state handled by slider
  },
  themeEmoji: {
    fontSize: 24,
  },
  themeOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  themeToggleSlider: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '48%',
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
});