import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const { items, total, clearCart } = useCart();

  const [mode, setMode] = useState<"ecommerce" | "whatsapp">("ecommerce");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0);

  // Group items by seller
  const sellerIds = [...new Set(items.map(i => i.sellerId))];

  const handleConfirm = async () => {
    if (!street || !city || !state || !zipCode) {
      Alert.alert("Missing Info", "Please fill in the delivery address");
      return;
    }
    if (!token || !user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      for (const sellerId of sellerIds) {
        const sellerItems = items.filter(i => i.sellerId === sellerId);
        await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sellerId,
            items: sellerItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
            deliveryAddress: { name, phone, street, city, state, zipCode },
            orderMode: mode,
          }),
        });
      }

      if (mode === "whatsapp") {
        const firstSeller = items[0];
        const msg = encodeURIComponent(
          `Hello, I would like to place an order:\n\nItems:\n${items.map(i => `- ${i.productName} (Qty: ${i.quantity}) - ₹${(i.price * i.quantity).toFixed(0)}`).join("\n")}\n\nTotal: ₹${total.toFixed(0)}\n\nDelivery Address:\n${street}, ${city}, ${state} - ${zipCode}\n\nName: ${name}\nPhone: ${phone}`
        );
        Linking.openURL(`https://wa.me/${firstSeller.sellerName}?text=${msg}`).catch(() => {});
      }

      clearCart();
      router.replace("/(tabs)/orders");
    } catch {
      Alert.alert("Error", "Failed to place order. Please try again.");
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
        <Text style={[styles.title, { color: colors.foreground }]}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}>
        {/* Order summary */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Order Summary</Text>
          {items.map(item => (
            <View key={item.productId} style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.summaryName, { color: colors.foreground }]} numberOfLines={1}>{item.productName}</Text>
              <Text style={[styles.summaryQty, { color: colors.mutedForeground }]}>×{item.quantity}</Text>
              <Text style={[styles.summaryPrice, { color: colors.foreground }]}>₹{(item.price * item.quantity).toFixed(0)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>₹{total.toFixed(0)}</Text>
          </View>
        </View>

        {/* Order Mode */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Order Method</Text>
          <View style={styles.modeRow}>
            {([["ecommerce", "E-Commerce", "bag-outline"], ["whatsapp", "WhatsApp", "logo-whatsapp"]] as const).map(([m, label, icon]) => (
              <Pressable
                key={m}
                style={[styles.modeBtn, { borderColor: mode === m ? colors.primary : colors.border, backgroundColor: mode === m ? colors.primary + "15" : colors.card }]}
                onPress={() => setMode(m)}
              >
                <Ionicons name={icon} size={22} color={mode === m ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.modeLabel, { color: mode === m ? colors.primary : colors.mutedForeground }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Delivery Address */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Delivery Address</Text>
          {[
            ["Name", name, setName, "default" as const, "name"],
            ["Phone", phone, setPhone, "phone-pad" as const, "tel"],
            ["Street", street, setStreet, "default" as const, "street-address"],
            ["City", city, setCity, "default" as const, "address-level2"],
            ["State", state, setState, "default" as const, "address-level1"],
            ["Zip Code", zipCode, setZipCode, "numeric" as const, "postal-code"],
          ].map(([placeholder, value, setter]) => (
            <TextInput
              key={placeholder as string}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              placeholder={placeholder as string}
              placeholderTextColor={colors.mutedForeground}
              value={value as string}
              onChangeText={setter as (v: string) => void}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad }]}>
        <Pressable
          style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons name={mode === "whatsapp" ? "logo-whatsapp" : "checkmark-circle-outline"} size={20} color={colors.primaryForeground} />
              <Text style={[styles.confirmLabel, { color: colors.primaryForeground }]}>
                {mode === "whatsapp" ? "Send via WhatsApp" : "Place Order"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 16 },
  section: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1 },
  summaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  summaryName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryQty: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryPrice: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4 },
  totalLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  totalValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modeRow: { flexDirection: "row", gap: 12 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 2 },
  modeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular" },
  footer: { padding: 16, borderTopWidth: 1 },
  confirmBtn: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
