import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "@/lib/api";
import { getAuthToken } from "@/lib/api";

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const profile = await authAPI.getProfile();
          setUser(profile);
          setIsAdmin(profile.role === "admin");
        } catch (error) {
          console.error("Error checking auth:", error);
          // Token is invalid, remove it
          authAPI.logout();
          setUser(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authAPI.login(email, password);
    setUser(data.user);
    setIsAdmin(data.user.role === "admin");
  };

  const logout = async () => {
    authAPI.logout();
    setUser(null);
    setIsAdmin(false);
  };

  const value = {
    user,
    isAdmin,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
