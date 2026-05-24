import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/components/GlassCard";

const API_BASE = (() => { const d = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080"; return `${d.startsWith("localhost") ? "http" : "https"}://${d}`; })();

type Tab = "analytics" | "users" | "products" | "sellers";

export default function AdminPanelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const fetchData = useCallback(async (reset = false) => {
    if (!token) return;
    if (reset) setRefreshing(true);
    else setLoading(true);

    try {
      if (activeTab === "analytics") {
        const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) setStats(json.data);
      } else if (activeTab === "users") {
        const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) setUsers(json.data);
      } else if (activeTab === "products") {
        const res = await fetch(`${API_BASE}/api/products`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        setProducts(json.products || []);
      } else if (activeTab === "sellers") {
        const res = await fetch(`${API_BASE}/api/sellers`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        setSellers(json.sellers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApproveSeller = async (sellerId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/sellers/approve/${sellerId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert("Success", "Seller approved");
        fetchData();
      }
    } catch {
      Alert.alert("Error", "Failed to approve seller");
    }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        Alert.alert("Success", `User role updated to ${role}`);
        fetchData();
      }
    } catch {
      Alert.alert("Error", "Failed to update role");
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    Alert.alert("Delete Product", "Are you sure you want to remove this product?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/admin/products/${productId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) fetchData();
        } catch {}
      }}
    ]);
  };

  if (user?.role !== "admin") {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Admin Only</Text>
        <Pressable style={[styles.backBtn2, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderTabHeader = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
      {(["analytics", "users", "products", "sellers"] as Tab[]).map((tab) => (
        <Pressable key={tab} style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]} onPress={() => setActiveTab(tab)}>
          <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtnSmall}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Admin Dashboard</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Manage your marketplace</Text>
          </View>
        </View>
        {activeTab === "products" && (
          <Pressable onPress={() => router.push("/seller/add-product")} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={22} color={colors.primaryForeground} />
          </Pressable>
        )}
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}>
        {renderTabHeader()}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + (Platform.OS === "web" ? 34 : 0) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} />}
        >
          {activeTab === "analytics" && stats && (
            <View style={styles.grid}>
              <GlassCard style={styles.statCard}>
                <Ionicons name="people" size={24} color={colors.primary} />
                <Text style={[styles.statVal, { color: colors.foreground }]}>{stats.totalUsers}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Total Users</Text>
              </GlassCard>
              <GlassCard style={styles.statCard}>
                <Ionicons name="storefront" size={24} color={colors.warning} />
                <Text style={[styles.statVal, { color: colors.foreground }]}>{stats.totalSellers}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Total Sellers</Text>
              </GlassCard>
              <GlassCard style={styles.statCard}>
                <Ionicons name="cube" size={24} color={colors.success} />
                <Text style={[styles.statVal, { color: colors.foreground }]}>{stats.totalProducts}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Total Products</Text>
              </GlassCard>
              <GlassCard style={styles.statCard}>
                <Ionicons name="cash" size={24} color={colors.primary} />
                <Text style={[styles.statVal, { color: colors.foreground }]}>₹{stats.totalRevenue.toFixed(2)}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Total Revenue</Text>
              </GlassCard>
            </View>
          )}

          {activeTab === "users" && users.map(u => (
            <GlassCard key={u.id} style={{ marginBottom: 12 }}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{u.name}</Text>
                  <Text style={{ color: colors.mutedForeground }}>{u.email}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                  <Text style={{ color: colors.secondaryForeground, fontSize: 12 }}>{u.role}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => handleUpdateRole(u.id, u.role === "buyer" ? "seller" : "buyer")}>
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                    Toggle Role to {u.role === "buyer" ? "Seller" : "Buyer"}
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
          ))}

          {activeTab === "products" && products.map(p => (
            <GlassCard key={p.id} style={{ marginBottom: 12 }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={{ color: colors.mutedForeground }}>₹{p.price} • {p.stock} in stock</Text>
                </View>
                <Pressable style={[styles.actionBtn, { backgroundColor: colors.destructive + "20", padding: 8, borderRadius: 8 }]} onPress={() => handleDeleteProduct(p.id)}>
                  <Ionicons name="trash" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            </GlassCard>
          ))}

          {activeTab === "sellers" && sellers.map(s => (
            <GlassCard key={s.id} style={{ marginBottom: 12 }}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{s.shopName}</Text>
                  <Text style={{ color: colors.mutedForeground }}>{s.userName} • {s.userEmail}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: s.verified ? colors.success + "20" : colors.warning + "20" }]}>
                  <Text style={{ color: s.verified ? colors.success : colors.warning, fontSize: 12 }}>{s.verified ? "Verified" : "Pending"}</Text>
                </View>
              </View>
              {!s.verified && (
                <Pressable style={[styles.actionBtn, { marginTop: 12, backgroundColor: colors.success, padding: 12, borderRadius: 8, alignItems: "center" }]} onPress={() => handleApproveSeller(s.userId)}>
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Approve Seller</Text>
                </Pressable>
              )}
            </GlassCard>
          ))}

          {(activeTab !== "analytics" && (!users.length && !products.length && !sellers.length)) && (
            <View style={[styles.centered, { marginTop: 40 }]}>
              <Text style={{ color: colors.mutedForeground }}>No items found.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtnSmall: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  tabScroll: { flexGrow: 0 },
  tabScrollContent: { paddingHorizontal: 16 },
  tab: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "48%", padding: 16, alignItems: "center", gap: 8 },
  statVal: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  actions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#ffffff20" },
  actionBtn: { flexDirection: "row", alignItems: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  backBtn2: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 12 },
});
