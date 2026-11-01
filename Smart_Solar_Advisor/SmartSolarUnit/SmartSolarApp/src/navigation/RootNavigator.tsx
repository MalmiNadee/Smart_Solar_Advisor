import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthStack from './AuthStack';
import TabNavigator from './TabNavigator';
import PerformanceStack from './PerformanceStack';
import SettingsScreen from '../screens/SettingsScreen';
import Sidebar from '../components/Sidebar';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.solarOrange} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="PerformanceStack" component={PerformanceStack} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
      <Sidebar />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});