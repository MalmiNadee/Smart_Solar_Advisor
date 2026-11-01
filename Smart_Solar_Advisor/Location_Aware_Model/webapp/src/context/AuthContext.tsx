import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type UserRole = "customer" | "admin";

interface User {
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");

    if (roleParam === "admin" || roleParam === "customer") {
      const u: User = { email: "user@smartsolar.com", role: roleParam as UserRole };
      localStorage.setItem("solar_user", JSON.stringify(u));
      return u;
    }

    const stored = localStorage.getItem("solar_user");
    return stored ? JSON.parse(stored) : { email: "user@smartsolar.com", role: "customer" as UserRole };
  });

  const login = useCallback(async (email: string, _password: string, role: UserRole) => {
    // Simulated auth — replace with real API call
    if (!email) throw new Error("Email is required");
    const u: User = { email, role };
    localStorage.setItem("solar_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("solar_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
