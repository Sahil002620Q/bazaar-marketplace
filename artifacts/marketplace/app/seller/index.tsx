import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Dashboard {
  totalProducts: number; totalOrders: number; pendingOrders: number;
  totalRevenue: number; orderingMode: string;
  recentOrders: Array<{ id: number; orderId: string; buyerName: string; totalPrice: number; status: string; createdAt: string; items: Array<{ productName: string; quantity: number }> }>;
}

interface Product {
  id: number; name: string; category: string; price: number; stock: number; images: string[]; unit: string;
}

type Tab = "dashboard" | "products" | "orders";

export default function SellerDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (reset = false) => {
    if (!token) return;
    if (reset) setRefreshing(true);
    else setLoading(true);
    try {
      const [dashRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/api/sellers/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/products?sellerId=me&limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

  const handleDeleteProduct = async (productId: number) => {
    if (!token) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await fetch(`${API_BASE}/api/products/${productId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchData(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon as never} size={24} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Seller Dashboard</Text>
        </View>
        <Pressable onPress={() => router.push("/seller/add-product")} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["dashboard", "products", "orders"] as Tab[]).map(t => (
          <Pressable
            key={t}
            style={[styles.tab, { borderBottomColor: tab === t ? colors.primary : "transparent" }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={tab === "dashboard" ? (dashboard?.recentOrders ?? []) : tab === "products" ? products : []}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} />}
        scrollEnabled
        ListHeaderComponent={
          tab === "dashboard" && dashboard ? (
            <View style={styles.statsGrid}>
              <StatCard icon="bag-outline" label="Products" value={dashboard.totalProducts.toString()} color={colors.primary} />
              <StatCard icon="receipt-outline" label="Orders" value={dashboard.totalOrders.toString()} color={colors.warning} />
              <StatCard icon="time-outline" label="Pending" value={dashboard.pendingOrders.toString()} color={colors.destructive} />
              <StatCard icon="cash-outline" label="Revenue" value={`₹${dashboard.totalRevenue.toFixed(0)}`} color={colors.success} />
              {dashboard.recentOrders.length > 0 && (
                <Text style={[styles.recentTitle, { color: colors.foreground }]}>Recent Orders</Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (tab === "products") {
            const p = item as Product;
            return (
              <View style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.foreground }]}>{p.name}</Text>
                  <Text style={[styles.productMeta, { color: colors.mutedForeground }]}>₹{p.price} · {p.stock} in stock · {p.unit}</Text>
                </View>
                <View style={styles.productActions}>
                  <Pressable onPress={() => router.push({ pathname: "/seller/add-product", params: { id: p.id.toString() } })}>
                    <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteProduct(p.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
            );
          }
          // Dashboard/Orders view
          const o = item as Dashboard["recentOrders"][0];
          return (
            <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.orderHeader}>
                <Text style={[styles.orderId, { color: colors.primary }]}>{o.orderId}</Text>
                <OrderStatusBadge status={o.status} />
              </View>
              <Text style={[styles.buyerName, { color: colors.foreground }]}>{o.buyerName}</Text>
              <Text style={[styles.orderItems, { color: colors.mutedForeground }]} numberOfLines={1}>
                {o.items?.map(i => `${i.productName} ×${i.quantity}`).join(", ")}
              </Text>
              <Text style={[styles.orderTotal, { color: colors.foreground }]}>₹{Number(o.totalPrice).toFixed(0)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.centered, { marginTop: 40 }]}>
            <Ionicons name={tab === "products" ? "bag-outline" : "receipt-outline"} size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {tab === "products" ? "No products yet" : "No orders yet"}
            </Text>
            {tab === "products" && (
              <Pressable style={[styles.addProductBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/seller/add-product")}>
                <Text style={[{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }]}>Add First Product</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2 },
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 },
  statCard: { flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recentTitle: { width: "100%", fontSize: 16, fontFamily: "Inter_600SemiBold", paddingTop: 8, paddingHorizontal: 4 },
  list: { padding: 12, gap: 10 },
  productRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center" },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  productActions: { flexDirection: "row", gap: 16 },
  orderCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  buyerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  orderItems: { fontSize: 13, fontFamily: "Inter_400Regular" },
  orderTotal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  addProductBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
});
