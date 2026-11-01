import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { SidebarProvider } from './src/contexts/SidebarContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import SplashScreen from './src/screens/SplashScreen';

export default function App() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {!isSplashDone ? (
            <SplashScreen onFinish={() => setIsSplashDone(true)} />
          ) : (
            <NavigationContainer>
              <AuthProvider>
                <SidebarProvider>
                  <RootNavigator />
                </SidebarProvider>
              </AuthProvider>
            </NavigationContainer>
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}