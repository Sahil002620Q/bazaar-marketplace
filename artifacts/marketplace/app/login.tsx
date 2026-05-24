import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

WebBrowser.maybeCompleteAuthSession();

type Mode = "login" | "register";
const BASE_URL = (() => { const d = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080"; return `${d.startsWith("localhost") ? "http" : "https"}://${d}`; })();
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// ─── Isolated Google button component (hook only runs when this mounts) ───────
function GoogleSignInButton({
  onSuccess,
  onError,
  colors,
}: {
  onSuccess: (accessToken: string) => void;
  onError: (msg: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID!,
    expoClientId: GOOGLE_CLIENT_ID!,
    selectAccount: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const token = response.authentication?.access_token;
      if (token) { setBusy(true); onSuccess(token); }
      else onError("Google sign-in failed — no token");
    } else if (response.type === "error") {
      onError("Google sign-in was cancelled or failed");
    }
  }, [response]);

  return (
    <Pressable
      style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: (!request || busy) ? 0.6 : 1 }]}
      onPress={() => { promptAsync(); }}
      disabled={!request || busy}
    >
      {busy ? (
        <ActivityIndicator color={colors.foreground} size="small" />
      ) : (
        <>
          <View style={styles.googleIconWrap}>
            <Text style={styles.googleIconText}>G</Text>
          </View>
          <Text style={[styles.googleLabel, { color: colors.foreground }]}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

// ─── Main login screen ─────────────────────────────────────────────────────────
export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async (accessToken: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Google sign-in failed"); return; }
      await login(data.token, data.user);
      router.replace("/(tabs)");
    } catch {
      setError("Network error during Google sign-in");
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password.trim()) { setError("Password is required"); return; }
    if (mode === "register" && password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (mode === "register" && !name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register"
        ? { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password }
        : { email: email.trim().toLowerCase(), password };
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? data.error ?? "Something went wrong"); return; }
      await login(data.token, data.user);
      router.replace("/(tabs)");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
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
            <View style={[styles.modeToggle, { backgroundColor: colors.muted }]}>
              {(["login", "register"] as Mode[]).map(m => (
                <Pressable
                  key={m}
                  style={[styles.modeButton, { backgroundColor: mode === m ? colors.primary : "transparent" }]}
                  onPress={() => { setMode(m); setError(""); }}
                >
                  <Text style={[styles.modeLabel, { color: mode === m ? colors.primaryForeground : colors.mutedForeground }]}>
                    {m === "login" ? "Sign In" : "Create Account"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Google button — only rendered when client ID is configured */}
            {!!GOOGLE_CLIENT_ID && (
              <View style={styles.socialSection}>
                <GoogleSignInButton
                  colors={colors}
                  onSuccess={handleGoogleLogin}
                  onError={setError}
                />
                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>
              </View>
            )}

            {/* Email / phone form */}
            <View style={styles.form}>
              {mode === "register" && (
                <View style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Full Name" placeholderTextColor={colors.mutedForeground}
                    value={name} onChangeText={setName} autoCapitalize="words"
                  />
                </View>
              )}

              <View style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Email address" placeholderTextColor={colors.mutedForeground}
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                />
              </View>

              {mode === "register" && (
                <View style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons name="call-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Phone number (optional)" placeholderTextColor={colors.mutedForeground}
                    value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                  />
                </View>
              )}

              <View style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={mode === "register" ? "Create password (min 6 chars)" : "Password"}
                  placeholderTextColor={colors.mutedForeground}
                  value={password} onChangeText={setPassword}
                  secureTextEntry={!showPassword} autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(v => !v)} style={{ paddingLeft: 8 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>

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
  logoContainer: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  modeToggle: { flexDirection: "row", padding: 4, marginBottom: 20, borderRadius: 12 },
  modeButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  modeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  socialSection: { marginBottom: 4 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 16 },
  googleIconWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#4285F4", alignItems: "center", justifyContent: "center" },
  googleIconText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  googleLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 4 },
  form: { gap: 12 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, gap: 8 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitButton: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  submitLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  note: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
});
