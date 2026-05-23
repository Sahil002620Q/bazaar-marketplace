import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "register";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (mode === "register" && !name.trim()) { setError("Name is required"); return; }
    if (mode === "register" && !phone.trim()) { setError("Phone is required"); return; }

    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register"
        ? { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() }
        : { email: email.trim().toLowerCase() };

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? data.error ?? "Something went wrong");
        return;
      }

      await login(data.token, data.user);
      router.replace("/(tabs)");
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="basket" size={32} color={colors.primaryForeground} />
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>Bazaar</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Homemade food & handcrafted goods
            </Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Mode toggle */}
            <View style={[styles.modeToggle, { backgroundColor: colors.muted, borderRadius: 12 }]}>
              {(["login", "register"] as Mode[]).map(m => (
                <Pressable
                  key={m}
                  style={[styles.modeButton, { backgroundColor: mode === m ? colors.primary : "transparent", borderRadius: 10 }]}
                  onPress={() => { setMode(m); setError(""); }}
                >
                  <Text style={[styles.modeLabel, { color: mode === m ? colors.primaryForeground : colors.mutedForeground }]}>
                    {m === "login" ? "Sign In" : "Create Account"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Form */}
            <View style={styles.form}>
              {mode === "register" && (
                <View style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Full Name"
                    placeholderTextColor={colors.mutedForeground}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Email address"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {mode === "register" && (
                <View style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons name="call-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Phone number"
                    placeholderTextColor={colors.mutedForeground}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              )}

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20" }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.submitButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.submitLabel, { color: colors.primaryForeground }]}>
                    {mode === "login" ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            {mode === "login"
              ? "Enter your email to sign in to your account."
              : "Register to start buying or selling on Bazaar."}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 32 },
  logoContainer: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: {
    borderRadius: 20, borderWidth: 1,
    padding: 20, marginBottom: 16,
  },
  modeToggle: { flexDirection: "row", padding: 4, marginBottom: 20 },
  modeButton: { flex: 1, paddingVertical: 10, alignItems: "center" },
  modeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  form: { gap: 12 },
  inputContainer: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: 10, gap: 8,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitButton: {
    height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  submitLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  note: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
});
