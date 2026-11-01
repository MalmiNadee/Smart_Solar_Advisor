import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PerformanceScreen from '../screens/PerformanceScreen';
import DailyPerformanceScreen from '../screens/DailyPerformanceScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import { useTheme } from '../contexts/ThemeContext';

export type PerformanceStackParamList = {
  Performance: { id: string; title: string; customerName?: string };
  Daily: { id: string; customerName?: string };
  Monthly: { id: string; customerName?: string };
};

const Stack = createStackNavigator<PerformanceStackParamList>();

export default function PerformanceStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator 
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '600' as const,
        },
      }}
    >
      <Stack.Screen 
        name="Performance" 
        component={PerformanceScreen} 
        options={({ route }) => ({ title: route.params?.title || 'Performance' })}
      />
      <Stack.Screen name="Daily" component={DailyPerformanceScreen} options={{ title: 'Daily Performance' }} />
      <Stack.Screen name="Monthly" component={MonthlySummaryScreen} options={{ title: 'Monthly Summary' }} />
    </Stack.Navigator>
  );
}