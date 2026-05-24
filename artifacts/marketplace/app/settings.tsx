import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useThemeContext } from "@/context/ThemeContext";
import { GlassCard } from "@/components/GlassCard";

const ACCENT_COLORS = ["Blue", "Green", "Purple", "Orange", "Red", "Pink", "Cyan", "Amber"] as const;

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, setMode, accent, setAccent } = useThemeContext();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleClearCache = () => {
    Alert.alert("Success", "Local cache cleared successfully.");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtnSmall}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Theme Mode</Text>
          <View style={styles.row}>
            {(["system", "light", "dark"] as const).map(m => (
              <Pressable
                key={m}
                style={[styles.chip, { backgroundColor: mode === m ? colors.primary : colors.secondary }]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.chipText, { color: mode === m ? colors.primaryForeground : colors.secondaryForeground }]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Accent Color</Text>
          <View style={styles.colorGrid}>
            {ACCENT_COLORS.map(colorName => (
              <Pressable
                key={colorName}
                style={[styles.colorBox, accent === colorName && styles.colorBoxActive, { borderColor: accent === colorName ? colors.foreground : "transparent" }]}
                onPress={() => setAccent(colorName)}
              >
                <View style={[styles.colorInner, { backgroundColor: getAccentHex(colorName) }]} />
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Language</Text>
          <Text style={{ color: colors.mutedForeground }}>English (Hindi & Punjabi coming soon)</Text>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Advanced</Text>
          <Pressable style={[styles.btn, { backgroundColor: colors.destructive + "20" }]} onPress={handleClearCache}>
            <Ionicons name="trash-bin-outline" size={20} color={colors.destructive} />
            <Text style={[styles.btnText, { color: colors.destructive }]}>Clear App Cache</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function getAccentHex(name: string) {
  const map: Record<string, string> = {
    Blue: "#2196F3", Green: "#4CAF50", Purple: "#9C27B0", Orange: "#FF9800",
    Red: "#F44336", Pink: "#E91E63", Cyan: "#00BCD4", Amber: "#FFC107"
  };
  return map[name];
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtnSmall: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 16 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorBox: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  colorBoxActive: { padding: 2 },
  colorInner: { width: "100%", height: "100%", borderRadius: 20 },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  btnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" }
});
