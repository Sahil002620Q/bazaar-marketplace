import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "buyer" | "seller" | "admin";
  sellerApproved: boolean;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level token reference for setAuthTokenGetter
export let currentAuthToken: string | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem("auth_token"),
          AsyncStorage.getItem("auth_user"),
        ]);
        if (storedToken && storedUser) {
          currentAuthToken = storedToken;
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newToken: string, newUser: AuthUser) => {
    currentAuthToken = newToken;
    setToken(newToken);
    setUser(newUser);
    await Promise.all([
      AsyncStorage.setItem("auth_token", newToken),
      AsyncStorage.setItem("auth_user", JSON.stringify(newUser)),
    ]);
  }, []);

  const logout = useCallback(async () => {
    currentAuthToken = null;
    setToken(null);
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem("auth_token"),
      AsyncStorage.removeItem("auth_user"),
    ]);
  }, []);

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated);
    AsyncStorage.setItem("auth_user", JSON.stringify(updated)).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
