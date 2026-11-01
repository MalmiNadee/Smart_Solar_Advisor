import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CustomerAnalysisScreen from '../screens/CustomerAnalysisScreen';
import SeasonalPredictionScreen from '../screens/SeasonalPredictionScreen';
import XAIInsightsScreen from '../screens/XAIInsightsScreen';

const Stack = createStackNavigator();

export default function AnalysisStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CustomerAnalysis" component={CustomerAnalysisScreen} />
      <Stack.Screen name="SeasonalPrediction" component={SeasonalPredictionScreen} />
      <Stack.Screen name="XAIInsights" component={XAIInsightsScreen} />
    </Stack.Navigator>
  );
}

