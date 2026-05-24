import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = (() => { const d = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080"; return `${d.startsWith("localhost") ? "http" : "https"}://${d}`; })();

export default function BecomeSellerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, updateUser, user } = useAuth();

  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [orderingMode, setOrderingMode] = useState<"ecommerce" | "whatsapp">("ecommerce");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleSubmit = async () => {
    if (!shopName || !phone || !address) {
      Alert.alert("Missing Fields", "Shop name, phone, and address are required");
      return;
    }
    if (orderingMode === "whatsapp" && !whatsappNumber) {
      Alert.alert("Missing Fields", "WhatsApp number is required for WhatsApp mode");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellers/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shopName, phone, address, orderingMode, whatsappNumber, paymentMethods: ["cod"] }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Application Submitted", "Your seller application is pending admin approval. You'll be notified once approved.", [
          { text: "OK", onPress: () => router.replace("/(tabs)/account") },
        ]);
      } else {
        Alert.alert("Error", data.message ?? data.error ?? "Failed to submit application");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Become a Seller</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.infoCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Your application will be reviewed by an admin before you can start selling.
          </Text>
        </View>

        {[
          ["Shop Name", shopName, setShopName, "e.g., Amma's Kitchen"],
          ["Phone Number", phone, setPhone, "+91 9876543210"],
          ["Full Address", address, setAddress, "Street, City, State"],
        ].map(([label, value, setter, placeholder]) => (
          <View key={label as string} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{label as string} *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              placeholder={placeholder as string}
              placeholderTextColor={colors.mutedForeground}
              value={value as string}
              onChangeText={setter as (v: string) => void}
            />
          </View>
        ))}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Ordering Mode *</Text>
          {(["ecommerce", "whatsapp"] as const).map(m => (
            <Pressable
              key={m}
              style={[styles.modeOption, { borderColor: orderingMode === m ? colors.primary : colors.border, backgroundColor: orderingMode === m ? colors.primary + "10" : colors.card }]}
              onPress={() => setOrderingMode(m)}
            >
              <Ionicons name={m === "ecommerce" ? "bag-outline" : "logo-whatsapp"} size={20} color={orderingMode === m ? colors.primary : colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeLabel, { color: colors.foreground }]}>
                  {m === "ecommerce" ? "E-Commerce" : "WhatsApp"}
                </Text>
                <Text style={[styles.modeDesc, { color: colors.mutedForeground }]}>
                  {m === "ecommerce" ? "Receive and manage orders in the app" : "Receive orders via WhatsApp messages"}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: orderingMode === m ? colors.primary : colors.border }]}>
                {orderingMode === m && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
            </Pressable>
          ))}
        </View>

        {orderingMode === "whatsapp" && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>WhatsApp Number *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              placeholder="+91 9876543210"
              placeholderTextColor={colors.mutedForeground}
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
            />
          </View>
        )}

        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitLabel, { color: colors.primaryForeground }]}>Submit Application</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  modeOption: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12, marginBottom: 8 },
  modeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  submitBtn: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  submitLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
