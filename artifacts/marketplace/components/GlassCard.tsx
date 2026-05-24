import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { useColors } from "@/hooks/useColors";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  padding?: number;
}

export function GlassCard({ children, style, intensity = 15, padding = 16 }: GlassCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[styles.content, { 
        backgroundColor: colors.card + "D9", // 85% opacity
        borderColor: colors.border + "33", // 20% opacity border
        padding,
      }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
  },
  content: {
    borderWidth: 1,
    borderRadius: 20,
  },
});
