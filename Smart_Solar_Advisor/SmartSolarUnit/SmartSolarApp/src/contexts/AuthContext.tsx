import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { storage } from '../services/storage';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await storage.getToken();
        const storedUser = await storage.getUser();
        
        if (token && storedUser) {
          // Verify token is still valid by fetching profile
          try {
            const profile = await authAPI.getProfile();
            setUser({
              id: profile.id,
              email: profile.email,
              role: profile.role,
              customerName: profile.customer_name,
            });
          } catch (error) {
            // Token invalid, clear storage
            await storage.clearAll();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const userData: User = {
        id: response.user?.id || response.id,
        email: response.user?.email || response.email || email,
        role: response.user?.role || response.role || 'site_owner',
        customerName: response.user?.customer_name || response.customer_name,
      };
      
      setUser(userData);
      await storage.setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      // Clear local state even if API call fails
      setUser(null);
      await storage.clearAll();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
