// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/api";

type User = { _id: string; username: string; email?: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

 
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Error loading auth from storage:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token: t, user: u } = res.data;

      await AsyncStorage.setItem("token", t);
      await AsyncStorage.setItem("user", JSON.stringify(u));

      setToken(t);
      setUser(u);

      return u;
    } catch (err: any) {
      console.error("Login error:", err.response?.data || err.message);
      throw err.response?.data || new Error("Login failed");
    } finally {
      setLoading(false);
    }
  };


  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { username, email, password });
      const { token: t, user: u } = res.data;

      await AsyncStorage.setItem("token", t);
      await AsyncStorage.setItem("user", JSON.stringify(u));

      setToken(t);
      setUser(u);

      return u;
    } catch (err: any) {
      console.error("Register error:", err.response?.data || err.message);
      throw err.response?.data || new Error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      await AsyncStorage.multiRemove(["token", "user"]);
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
