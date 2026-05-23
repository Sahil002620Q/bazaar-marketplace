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
  const [stateName, setStateName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0);

  // Group items by seller
  const sellerIds = [...new Set(items.map(i => i.sellerId))];

  const handleConfirm = async () => {
    if (!name.trim() || !phone.trim() || !street.trim() || !city.trim() || !stateName.trim() || !zipCode.trim()) {
      Alert.alert("Missing Info", "Please fill in all delivery address fields");
      return;
    }
    if (!token || !user) {
      router.push("/login");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty");
      return;
    }

    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const deliveryAddress = { name: name.trim(), phone: phone.trim(), street: street.trim(), city: city.trim(), state: stateName.trim(), zipCode: zipCode.trim() };

      for (const sellerId of sellerIds) {
        const sellerItems = items.filter(i => i.sellerId === sellerId);
        const res = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sellerId,
            items: sellerItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
            deliveryAddress,
            orderMode: mode,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message ?? "Failed to place order");
        }
      }

      if (mode === "whatsapp") {
        // Find seller whatsapp from items (use sellerName as fallback — ideally fetch from API)
        const firstSeller = items[0];
        const sellerPhone = firstSeller?.sellerName ?? "";
        const msg = encodeURIComponent(
          `Hello! I would like to place an order:\n\n` +
          items.map(i => `• ${i.productName} ×${i.quantity} — ₹${(i.price * i.quantity).toFixed(0)}`).join("\n") +
          `\n\nTotal: ₹${total.toFixed(0)}\n\nDelivery to:\n${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} - ${deliveryAddress.zipCode}\nName: ${name}\nPhone: ${phone}`
        );
        const waPhone = sellerPhone.replace(/[^0-9+]/g, "");
        if (waPhone) {
          Linking.openURL(`https://wa.me/${waPhone}?text=${msg}`).catch(() => {});
        }
      }

      clearCart();
      router.replace("/(tabs)/orders");
    } catch (e) {
      Alert.alert("Error", (e as Error).message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]} keyboardShouldPersistTaps="handled">
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
            {([
              ["ecommerce", "E-Commerce", "bag-handle-outline", "Track orders in app"],
              ["whatsapp", "WhatsApp", "logo-whatsapp", "Message seller directly"],
            ] as const).map(([m, label, icon, desc]) => (
              <Pressable
                key={m}
                style={[styles.modeBtn, { borderColor: mode === m ? colors.primary : colors.border, backgroundColor: mode === m ? colors.primary + "12" : colors.card }]}
                onPress={() => setMode(m)}
              >
                <Ionicons name={icon} size={22} color={mode === m ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.modeLabel, { color: mode === m ? colors.primary : colors.foreground }]}>{label}</Text>
                <Text style={[styles.modeDesc, { color: colors.mutedForeground }]}>{desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Delivery Address */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Delivery Address</Text>
          <View style={styles.formGrid}>
            <TextInput style={[...inputStyle, { flex: 1 }]} placeholder="Full Name" placeholderTextColor={colors.mutedForeground} value={name} onChangeText={setName} autoCapitalize="words" />
            <TextInput style={[...inputStyle, { flex: 1 }]} placeholder="Phone" placeholderTextColor={colors.mutedForeground} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <TextInput style={inputStyle} placeholder="Street address" placeholderTextColor={colors.mutedForeground} value={street} onChangeText={setStreet} />
          <View style={styles.formGrid}>
            <TextInput style={[...inputStyle, { flex: 1 }]} placeholder="City" placeholderTextColor={colors.mutedForeground} value={city} onChangeText={setCity} />
            <TextInput style={[...inputStyle, { flex: 1 }]} placeholder="State" placeholderTextColor={colors.mutedForeground} value={stateName} onChangeText={setStateName} />
          </View>
          <TextInput style={inputStyle} placeholder="Zip Code" placeholderTextColor={colors.mutedForeground} value={zipCode} onChangeText={setZipCode} keyboardType="numeric" />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad }]}>
        <View style={styles.footerTotal}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Total to pay</Text>
          <Text style={[styles.footerAmount, { color: colors.foreground }]}>₹{total.toFixed(0)}</Text>
        </View>
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
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 4 },
  modeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modeDesc: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  formGrid: { flexDirection: "row", gap: 10 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular" },
  footer: { padding: 16, borderTopWidth: 1, gap: 10 },
  footerTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  footerAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  confirmBtn: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
