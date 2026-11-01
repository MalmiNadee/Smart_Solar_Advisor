import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { databaseService } from '../services/database';

const THEME_KEY = 'theme_preference';

interface ThemeColors {
  primary: string;
  solarOrange: string;
  white: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  gray: string;
  lightGray: string;
}

interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: "#0F172A",
    solarOrange: "#F97316",
    white: "#FFFFFF",
    background: "#F1F5F9",
    card: "#FFFFFF",
    text: "#0F172A",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    success: "#22C55E",
    warning: "#EAB308",
    danger: "#EF4444",
    gray: "#94A3B8",
    lightGray: "#F8FAFC",
  },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: "#1E293B",
    solarOrange: "#FB923C",
    white: "#F8FAFC",
    background: "#0F172A",
    card: "#1E293B",
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    border: "#334155",
    success: "#4ADE80",
    warning: "#FCD34D",
    danger: "#F87171",
    gray: "#64748B",
    lightGray: "#1E293B",
  },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [theme, setTheme] = useState<Theme>(lightTheme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    setTheme(isDark ? darkTheme : lightTheme);
  }, [isDark]);

  const loadThemePreference = async () => {
    try {
      await databaseService.initDatabase();
      const savedTheme = await databaseService.getSetting(THEME_KEY);
      if (savedTheme === 'dark') {
        setIsDark(true);
      } else {
        setIsDark(false);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      setIsDark(false); // Default to light theme on error
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    try {
      await databaseService.setSetting(THEME_KEY, newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
      // Revert on error
      setIsDark(!newTheme);
    }
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    isDark,
    colors: theme.colors,
  };

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Export colors for backward compatibility
export const Colors = lightTheme.colors;

