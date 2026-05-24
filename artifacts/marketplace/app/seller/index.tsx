import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = (() => { const d = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080"; return `${d.startsWith("localhost") ? "http" : "https"}://${d}`; })();

interface Dashboard {
  sellerId: number;
  totalProducts: number; totalOrders: number; pendingOrders: number;
  totalRevenue: number; orderingMode: string;
  recentOrders: Array<{ id: number; orderId: string; buyerName: string; totalPrice: number; status: string; createdAt: string; items: Array<{ productName: string; quantity: number }> }>;
}

interface SalesHistory {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  mostSoldProduct: string;
}

interface Product {
  id: number; name: string; category: string; price: number; stock: number; images: string[]; unit: string;
}

interface SellerOrder {
  id: number; orderId: string; buyerName: string; totalPrice: number; status: string; createdAt: string;
  items: Array<{ productName: string; quantity: number }>;
}

type Tab = "dashboard" | "products" | "orders";

export default function SellerDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [salesHistory, setSalesHistory] = useState<SalesHistory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (reset = false) => {
    if (!token) return;
    if (reset) setRefreshing(true);
    else setLoading(true);
    try {
      // Always fetch dashboard first to get sellerId
      const dashRes = await fetch(`${API_BASE}/api/sellers/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (!dashRes.ok) throw new Error("Not a seller");
      const dash: Dashboard = await dashRes.json();
      setDashboard(dash);

      // Fetch products using sellerId from dashboard
      const [prodRes, ordersRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/products?sellerId=${dash.sellerId}&limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/sellers/orders?limit=30`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/sellers/sales-history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
      if (ordersRes.ok) { const d = await ordersRes.json(); setOrders(d.orders ?? []); }
      if (historyRes.ok) { const d = await historyRes.json(); setSalesHistory(d); }
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
    Alert.alert("Delete Product", "Are you sure you want to remove this product?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await fetch(`${API_BASE}/api/products/${productId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          fetchData(true);
        }
      },
    ]);
  };

  const handleUpdateOrderStatus = async (orderId: number, currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      pending: "confirmed",
      confirmed: "shipped",
      shipped: "delivered",
    };
    const nextStatus = statusFlow[currentStatus];
    if (!nextStatus) return;

    try {
      await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchData(true);
    } catch {
      Alert.alert("Error", "Failed to update order status");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="storefront-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.foreground }]}>No seller profile found</Text>
        <Pressable style={[styles.addProductBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace("/become-seller")}>
          <Text style={[{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>Apply to Sell</Text>
        </Pressable>
      </View>
    );
  }

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon as never} size={22} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );

  const ExtraStatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
    <View style={[styles.statCard, { width: "100%", backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row", justifyContent: "flex-start", paddingHorizontal: 20 }]}>
      <Ionicons name={icon as never} size={28} color={color} style={{ marginRight: 12 }} />
      <View>
        <Text style={[styles.statValue, { color: colors.foreground, fontSize: 18 }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground, marginTop: 2 }]}>{label}</Text>
      </View>
    </View>
  );

  const listData: (Product | SellerOrder | Dashboard["recentOrders"][0])[] =
    tab === "products" ? products :
    tab === "orders" ? orders :
    dashboard.recentOrders;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Seller Dashboard</Text>
        </View>
        {tab === "products" && (
          <Pressable onPress={() => router.push("/seller/add-product")} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={22} color={colors.primaryForeground} />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["dashboard", "products", "orders"] as Tab[]).map(t => (
          <Pressable
            key={t}
            style={[styles.tabBtn, { borderBottomColor: tab === t ? colors.primary : "transparent" }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "dashboard" ? "Overview" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {t === "orders" && dashboard.pendingOrders > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.warning }]}>
                <Text style={styles.tabBadgeText}>{dashboard.pendingOrders}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={listData as never[]}
        keyExtractor={(item: never) => (item as { id: number }).id.toString()}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} />}
        scrollEnabled
        ListHeaderComponent={
          tab === "dashboard" ? (
            <View>
              <View style={styles.statsGrid}>
                <StatCard icon="bag-outline" label="Products" value={dashboard.totalProducts.toString()} color={colors.primary} />
                <StatCard icon="receipt-outline" label="Orders" value={dashboard.totalOrders.toString()} color={colors.warning} />
                <StatCard icon="time-outline" label="Pending" value={dashboard.pendingOrders.toString()} color={dashboard.pendingOrders > 0 ? colors.destructive : colors.success} />
                <StatCard icon="cash-outline" label="Revenue" value={`₹${dashboard.totalRevenue.toFixed(0)}`} color={colors.success} />
              </View>
              {salesHistory && (
                <View style={[styles.statsGrid, { paddingTop: 0 }]}>
                  <ExtraStatCard icon="star-outline" label="Most Sold Product" value={salesHistory.mostSoldProduct} color={colors.primary} />
                  <ExtraStatCard icon="analytics-outline" label="Average Order Value" value={`₹${salesHistory.avgOrderValue.toFixed(0)}`} color={colors.success} />
                </View>
              )}
              {listData.length > 0 && (
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
                  <Text style={[styles.productMeta, { color: colors.mutedForeground }]}>
                    ₹{p.price} · {p.stock} in stock · {p.unit}
                  </Text>
                </View>
                <View style={styles.productActions}>
                  <Pressable
                    style={[styles.actionIconBtn, { backgroundColor: colors.primary + "20" }]}
                    onPress={() => router.push({ pathname: "/seller/add-product", params: { id: p.id.toString() } })}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.actionIconBtn, { backgroundColor: colors.destructive + "20" }]}
                    onPress={() => handleDeleteProduct(p.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
            );
          }

          const o = item as SellerOrder;
          const canAdvance = ["pending", "confirmed", "shipped"].includes(o.status);
          const nextStatusLabel: Record<string, string> = {
            pending: "Confirm", confirmed: "Mark Shipped", shipped: "Mark Delivered",
          };

          return (
            <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.orderHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderId, { color: colors.primary }]}>{o.orderId}</Text>
                  <Text style={[styles.buyerName, { color: colors.foreground }]}>{o.buyerName}</Text>
                  <Text style={[styles.orderItems, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {o.items?.map(i => `${i.productName} ×${i.quantity}`).join(", ")}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <OrderStatusBadge status={o.status} />
                  <Text style={[styles.orderTotal, { color: colors.foreground }]}>₹{Number(o.totalPrice).toFixed(0)}</Text>
                </View>
              </View>
              {canAdvance && (
                <Pressable
                  style={[styles.advanceBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleUpdateOrderStatus(o.id, o.status)}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={16} color="#fff" />
                  <Text style={styles.advanceBtnText}>{nextStatusLabel[o.status]}</Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.centered, { marginTop: 40 }]}>
            <Ionicons name={tab === "products" ? "bag-outline" : "receipt-outline"} size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {tab === "products" ? "No products yet" : tab === "orders" ? "No orders yet" : "No recent orders"}
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
  tabsRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, flexDirection: "row", justifyContent: "center", gap: 6 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 },
  statCard: { flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recentTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", paddingHorizontal: 16, paddingBottom: 8 },
  list: { padding: 12, gap: 10 },
  productRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center" },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  productActions: { flexDirection: "row", gap: 8 },
  actionIconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  orderCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  orderHeader: { flexDirection: "row", gap: 12 },
  orderId: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  buyerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  orderItems: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  orderRight: { alignItems: "flex-end", gap: 6 },
  orderTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  advanceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 38, borderRadius: 10, gap: 6 },
  advanceBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  addProductBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
});
