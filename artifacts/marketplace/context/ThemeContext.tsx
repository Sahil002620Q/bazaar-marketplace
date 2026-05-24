import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";
type AccentColor = "Blue" | "Green" | "Purple" | "Orange" | "Red" | "Pink" | "Cyan" | "Amber";

const ACCENT_COLORS: Record<AccentColor, string> = {
  Blue: "#2196F3",
  Green: "#4CAF50",
  Purple: "#9C27B0",
  Orange: "#FF9800",
  Red: "#F44336",
  Pink: "#E91E63",
  Cyan: "#00BCD4",
  Amber: "#FFC107"
};

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  isDark: boolean;
  activeAccentHex: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [accent, setAccentState] = useState<AccentColor>("Blue");

  useEffect(() => {
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem("theme_mode");
        const savedAccent = await AsyncStorage.getItem("theme_accent");
        if (savedMode) setModeState(savedMode as ThemeMode);
        if (savedAccent) setAccentState(savedAccent as AccentColor);
      } catch (e) {
        // Ignore
      }
    })();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem("theme_mode", m).catch(() => {});
  };

  const setAccent = (a: AccentColor) => {
    setAccentState(a);
    AsyncStorage.setItem("theme_accent", a).catch(() => {});
  };

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
  const activeAccentHex = ACCENT_COLORS[accent];

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent, isDark, activeAccentHex }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeContext must be used within ThemeProvider");
  return context;
}
