import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  const handleLogout = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace("/login");
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Ionicons name="person-circle-outline" size={64} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Not signed in</Text>
        <Pressable style={[styles.signInBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/login")}>
          <Text style={[styles.signInLabel, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const roleLabel = user.role === "seller" ? (user.sellerApproved ? "Verified Seller" : "Seller (Pending)") : "Buyer";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: user.sellerApproved ? colors.success + "20" : colors.muted }]}>
              <Text style={[styles.roleText, { color: user.sellerApproved ? colors.success : colors.mutedForeground }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Profile</Text>
          {[
            { icon: "person-outline", label: "Phone", value: user.phone },
            { icon: "mail-outline", label: "Email", value: user.email },
          ].map(item => (
            <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Ionicons name={item.icon as never} size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Quick Actions</Text>

          {(user.role === "seller" || user.sellerApproved) && (
            <Pressable
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push("/seller")}
            >
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Seller Dashboard</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}

          {user.role === "buyer" && !user.sellerApproved && (
            <Pressable
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push("/become-seller")}
            >
              <Ionicons name="storefront-outline" size={20} color={colors.warning} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Become a Seller</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}

          <Pressable
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push("/(tabs)/orders")}
          >
            <Ionicons name="receipt-outline" size={20} color={colors.foreground} />
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Order History</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutLabel, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Bazaar v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 16 },
  profileCard: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 16, gap: 16, alignItems: "center" },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontFamily: "Inter_700Bold" },
  email: { fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular", width: 50 },
  infoValue: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  actionLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 52, borderRadius: 14, borderWidth: 1, gap: 8 },
  logoutLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  signInBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  signInLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
