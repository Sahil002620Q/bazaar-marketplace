import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = (() => { const d = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080"; return `${d.startsWith("localhost") ? "http" : "https"}://${d}`; })();

interface Seller {
  id: number; userId: number; shopName: string; phone: string; address: string;
  orderingMode: string; verified: boolean; userName: string; userEmail: string;
  totalProducts: number; totalOrders: number; createdAt: string;
}

type Filter = "all" | "pending" | "approved";

export default function AdminPanelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const fetchSellers = useCallback(async (reset = false) => {
    if (!token) return;
    if (reset) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSellers(data.sellers ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const handleApprove = async (seller: Seller) => {
    setApprovingId(seller.userId);
    try {
      const res = await fetch(`${API_BASE}/api/sellers/approve/${seller.userId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSellers(prev => prev.map(s => s.userId === seller.userId ? { ...s, verified: true } : s));
        Alert.alert("Approved", `${seller.shopName} is now a verified seller.`);
      } else {
        Alert.alert("Error", "Failed to approve seller");
      }
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setApprovingId(null);
    }
  };

  const filtered = sellers.filter(s => {
    if (filter === "pending") return !s.verified;
    if (filter === "approved") return s.verified;
    return true;
  });

  const pendingCount = sellers.filter(s => !s.verified).length;

  if (user?.role !== "admin") {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Admin Only</Text>
        <Pressable style={[styles.backBtn2, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={[{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtnSmall}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Admin Panel</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {pendingCount > 0 ? `${pendingCount} pending approval` : "All sellers managed"}
            </Text>
          </View>
        </View>
        {pendingCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.warning }]}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {[
          { label: "Total", value: sellers.length, color: colors.foreground },
          { label: "Approved", value: sellers.filter(s => s.verified).length, color: colors.success },
          { label: "Pending", value: pendingCount, color: colors.warning },
        ].map(stat => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["all", "pending", "approved"] as Filter[]).map(f => (
          <Pressable
            key={f}
            style={[styles.filterTab, { borderBottomColor: filter === f ? colors.primary : "transparent" }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterLabel, { color: filter === f ? colors.primary : colors.mutedForeground }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 20) + (Platform.OS === "web" ? 34 : 0) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSellers(true)} tintColor={colors.primary} />}
          scrollEnabled
          renderItem={({ item: seller }) => (
            <View style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: seller.verified ? colors.border : colors.warning + "60" }]}>
              {/* Status indicator */}
              <View style={[styles.statusDot, { backgroundColor: seller.verified ? colors.success : colors.warning }]} />

              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={styles.shopInfo}>
                    <View style={[styles.shopAvatar, { backgroundColor: seller.verified ? colors.primary : colors.warning }]}>
                      <Text style={styles.shopAvatarText}>{seller.shopName.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={[styles.shopName, { color: colors.foreground }]}>{seller.shopName}</Text>
                      <Text style={[styles.ownerName, { color: colors.mutedForeground }]}>{seller.userName}</Text>
                    </View>
                  </View>
                  <View style={[styles.verifiedBadge, { backgroundColor: seller.verified ? colors.success + "20" : colors.warning + "20" }]}>
                    <Ionicons
                      name={seller.verified ? "checkmark-circle" : "time-outline"}
                      size={14}
                      color={seller.verified ? colors.success : colors.warning}
                    />
                    <Text style={[styles.verifiedText, { color: seller.verified ? colors.success : colors.warning }]}>
                      {seller.verified ? "Verified" : "Pending"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{seller.userEmail}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.detailText, { color: colors.mutedForeground }]} numberOfLines={1}>{seller.address}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="bag-outline" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                      {seller.totalProducts} products · {seller.totalOrders} orders · {seller.orderingMode}
                    </Text>
                  </View>
                </View>

                {!seller.verified && (
                  <Pressable
                    style={[styles.approveBtn, { backgroundColor: colors.success, opacity: approvingId === seller.userId ? 0.7 : 1 }]}
                    onPress={() => handleApprove(seller)}
                    disabled={approvingId === seller.userId}
                  >
                    {approvingId === seller.userId ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={styles.approveBtnText}>Approve Seller</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={[styles.centered, { marginTop: 60 }]}>
              <Ionicons name="storefront-outline" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No sellers found</Text>
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
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtnSmall: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  statsBar: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 12 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: { flexDirection: "row", borderBottomWidth: 1 },
  filterTab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2 },
  filterLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 12, gap: 12 },
  sellerCard: { borderRadius: 16, borderWidth: 1.5, padding: 14, position: "relative", overflow: "hidden" },
  statusDot: { position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  cardBody: { gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shopInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  shopAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  shopAvatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  shopName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ownerName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDetails: { gap: 5 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  approveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 42, borderRadius: 12, gap: 8 },
  approveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  backBtn2: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
});
