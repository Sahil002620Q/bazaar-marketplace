import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = (() => { const d = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080"; return `${d.startsWith("localhost") ? "http" : "https"}://${d}`; })();

interface OrderItem { productId: number; productName: string; quantity: number; price: number; subtotal: number; unit: string; }
interface Order {
  id: number; orderId: string; buyerName: string; shopName: string; sellerName: string;
  items: OrderItem[]; totalPrice: number; status: string; orderMode: string;
  deliveryAddress: { name: string; street: string; city: string; state: string; zipCode: string; phone: string };
  paymentStatus: string; sellerNotes?: string; trackingNumber?: string;
  createdAt: string; updatedAt: string;
}

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setOrder(await res.json());
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Order not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[{ color: colors.primary, fontFamily: "Inter_500Medium" }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Order Detail</Text>
          <Text style={[styles.orderId, { color: colors.primary }]}>{order.orderId}</Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
        {/* Progress tracker */}
        {!isCancelled && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Order Progress</Text>
            <View style={styles.progressRow}>
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                return (
                  <React.Fragment key={step}>
                    <View style={styles.stepContainer}>
                      <View style={[styles.stepDot, {
                        backgroundColor: done ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : "transparent",
                        borderWidth: active ? 2 : 0,
                        transform: [{ scale: active ? 1.2 : 1 }],
                      }]}>
                        {done && !active && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                      <Text style={[styles.stepLabel, { color: done ? colors.primary : colors.mutedForeground }]}>
                        {step.charAt(0).toUpperCase() + step.slice(1)}
                      </Text>
                    </View>
                    {i < STATUS_STEPS.length - 1 && (
                      <View style={[styles.stepLine, { backgroundColor: i < currentStep ? colors.primary : colors.muted }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* Items */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Items from {order.shopName}
          </Text>
          {order.items.map((item, i) => (
            <View key={i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.itemQty, { backgroundColor: colors.primary }]}>
                <Text style={styles.itemQtyText}>×{item.quantity}</Text>
              </View>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.productName}</Text>
              <Text style={[styles.itemPrice, { color: colors.foreground }]}>₹{item.subtotal?.toFixed(0) ?? (item.price * item.quantity).toFixed(0)}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>₹{order.totalPrice.toFixed(0)}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Delivery Address</Text>
          <View style={styles.addressBlock}>
            <Text style={[styles.addressName, { color: colors.foreground }]}>{order.deliveryAddress.name}</Text>
            <Text style={[styles.addressLine, { color: colors.mutedForeground }]}>{order.deliveryAddress.street}</Text>
            <Text style={[styles.addressLine, { color: colors.mutedForeground }]}>
              {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.zipCode}
            </Text>
            <Text style={[styles.addressLine, { color: colors.mutedForeground }]}>{order.deliveryAddress.phone}</Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Order Info</Text>
          {[
            ["Order Mode", order.orderMode === "whatsapp" ? "WhatsApp" : "E-Commerce"],
            ["Payment", order.paymentStatus],
            ["Placed On", new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })],
            ...(order.trackingNumber ? [["Tracking", order.trackingNumber]] : []),
          ].map(([label, value]) => (
            <View key={label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Seller notes */}
        {order.sellerNotes && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Note from Seller</Text>
            <Text style={[styles.notes, { color: colors.foreground }]}>{order.sellerNotes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  orderId: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 12, gap: 12 },
  section: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1 },
  progressRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  stepContainer: { alignItems: "center", gap: 6, flex: 0 },
  stepDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center", width: 54 },
  stepLine: { flex: 1, height: 2, marginBottom: 16 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  itemQty: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  itemQtyText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  itemName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  itemPrice: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  addressBlock: { gap: 3 },
  addressName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  addressLine: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  notes: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
