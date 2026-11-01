import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, BarChart3, User, LogOut, X, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const screenHeight = Dimensions.get('window').height;

export default function Sidebar() {
  const { isOpen, closeSidebar } = useSidebar();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(280)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : 280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen, slideAnim]);

  const handleNavigate = (screenName: string, params?: any) => {
    closeSidebar();
    // Navigate to the tab screen (optionally to nested screen)
    if (params) {
      navigation.navigate('Tabs', { screen: screenName, params });
    } else {
      navigation.navigate('Tabs', { screen: screenName });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel', onPress: closeSidebar },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            closeSidebar();
            await logout();
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: Home, label: 'Home', screen: 'Home' },
    { icon: BarChart3, label: 'Customer Analysis', screen: 'Analysis' },
    { icon: BarChart3, label: 'Seasonal Prediction', screen: 'Analysis', params: { screen: 'SeasonalPrediction' } },
    { icon: Sparkles, label: 'XAI Insights', screen: 'Analysis', params: { screen: 'XAIInsights' } },
    { icon: User, label: 'Profile', screen: 'Profile' },
  ];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={closeSidebar}
    >
      <View style={styles.container}>
        {/* Overlay */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSidebar}
        />
        
        {/* Sidebar */}
        <Animated.View style={[styles.sidebar, { backgroundColor: colors.primary }, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.logo}>☀️</Text>
                <View style={styles.headerText}>
                  <Text style={[styles.appName, { color: colors.white }]}>Solar Advisor</Text>
                  <Text style={[styles.appSubtitle, { color: colors.gray }]}>IoT Platform</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeSidebar} style={styles.closeButton}>
                <X size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* User Info */}
            <View style={styles.userSection}>
              <View style={[styles.userAvatar, { backgroundColor: `rgba(255, 255, 255, 0.2)` }]}>
                <User size={32} color={colors.white} />
              </View>
              <Text style={[styles.userName, { color: colors.white }]} numberOfLines={1}>
                {user?.customerName || user?.email || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.gray }]} numberOfLines={1}>
                {user?.email || ''}
              </Text>
            </View>

            {/* Navigation Items */}
            <View style={styles.menu}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.menuItem}
                    onPress={() => handleNavigate(item.screen, (item as any).params)}
                  >
                    <Icon size={24} color={colors.white} />
                    <Text style={[styles.menuItemText, { color: colors.white }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Logout Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: `rgba(239, 68, 68, 0.1)` }]}
                onPress={handleLogout}
              >
                <LogOut size={24} color={colors.danger} />
                <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    position: 'absolute',
    right: 0,
    top: 60, // Add margin from top
    bottom: 60, // Add margin from bottom
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logo: {
    fontSize: 32,
  },
  headerText: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  userSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  menu: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

