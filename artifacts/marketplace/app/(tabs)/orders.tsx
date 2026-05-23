import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface OrderItem { productName: string; quantity: number; price: number; }
interface Order {
  id: number; orderId: string; shopName: string; sellerName: string;
  items: OrderItem[]; totalPrice: number; status: string;
  orderMode: string; createdAt: string;
}

type Tab = "all" | "active" | "completed";

const ACTIVE_STATUSES = ["pending", "confirmed", "shipped"];
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();

  const [tab, setTab] = useState<Tab>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (reset = false) => {
    if (!token) return;
    if (reset) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = orders.filter(o => {
    if (tab === "active") return ACTIVE_STATUSES.includes(o.status);
    if (tab === "completed") return o.status === "delivered" || o.status === "cancelled";
    return true;
  });

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  if (!user) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to view orders</Text>
        <Pressable style={[styles.signInBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/login")}>
          <Text style={[styles.signInLabel, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
        <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
          {(["all", "active", "completed"] as Tab[]).map(t => (
            <Pressable
              key={t}
              style={[styles.tab, { backgroundColor: tab === t ? colors.primary : "transparent" }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, { color: tab === t ? colors.primaryForeground : colors.mutedForeground }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={o => o.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor={colors.primary} />}
          scrollEnabled={!!filteredOrders.length}
          renderItem={({ item: order }) => (
            <Pressable
              style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {}}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={[styles.orderId, { color: colors.primary }]}>{order.orderId}</Text>
                  <Text style={[styles.shopName, { color: colors.foreground }]}>{order.shopName}</Text>
                </View>
                <OrderStatusBadge status={order.status} />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.itemsText, { color: colors.mutedForeground }]} numberOfLines={2}>
                {order.items.map(i => `${i.productName} ×${i.quantity}`).join(", ")}
              </Text>

              <View style={styles.orderFooter}>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Text>
                <Text style={[styles.total, { color: colors.foreground }]}>₹{order.totalPrice.toFixed(0)}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={[styles.centered, { marginTop: 60 }]}>
              <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your orders will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  tabs: { flexDirection: "row", borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { padding: 12, gap: 12 },
  orderCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  shopName: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  divider: { height: 1 },
  itemsText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  total: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  signInBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  signInLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
