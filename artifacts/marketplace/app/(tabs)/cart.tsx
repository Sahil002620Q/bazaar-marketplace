import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, removeItem, updateQuantity, total, itemCount, clearCart } = useCart();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/checkout");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Cart</Text>
        {items.length > 0 && (
          <Pressable onPress={clearCart}>
            <Text style={[styles.clearText, { color: colors.destructive }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add products to get started</Text>
          <Pressable
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={[styles.browseLabel, { color: colors.primaryForeground }]}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 80 }]}>
            {items.map(item => (
              <View key={item.productId} style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.imageBox, { backgroundColor: colors.muted }]}>
                  {item.productImage ? (
                    <Image source={{ uri: item.productImage }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={24} color={colors.mutedForeground} />
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.productName}</Text>
                  <Text style={[styles.itemSeller, { color: colors.mutedForeground }]}>{item.sellerName}</Text>
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>₹{item.price.toFixed(0)} / {item.unit}</Text>

                  <View style={styles.quantityRow}>
                    <Pressable
                      style={[styles.qtyBtn, { backgroundColor: colors.muted }]}
                      onPress={() => { updateQuantity(item.productId, item.quantity - 1); }}
                    >
                      <Ionicons name="remove" size={16} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                    <Pressable
                      style={[styles.qtyBtn, { backgroundColor: colors.muted }]}
                      onPress={() => { if (item.quantity < item.stock) updateQuantity(item.productId, item.quantity + 1); }}
                    >
                      <Ionicons name="add" size={16} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.subtotal, { color: colors.foreground }]}>
                      = ₹{(item.price * item.quantity).toFixed(0)}
                    </Text>
                  </View>
                </View>

                <Pressable style={styles.removeBtn} onPress={() => removeItem(item.productId)}>
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0) }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>{itemCount} items</Text>
              <Text style={[styles.totalAmount, { color: colors.foreground }]}>₹{total.toFixed(0)}</Text>
            </View>
            <Pressable style={[styles.checkoutBtn, { backgroundColor: colors.primary }]} onPress={handleCheckout}>
              <Text style={[styles.checkoutLabel, { color: colors.primaryForeground }]}>Proceed to Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  clearText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  browseButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  browseLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { padding: 12, gap: 12 },
  cartItem: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 12, gap: 12, alignItems: "flex-start" },
  imageBox: { width: 72, height: 72, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  itemSeller: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  itemPrice: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  qty: { fontSize: 15, fontFamily: "Inter_600SemiBold", minWidth: 20, textAlign: "center" },
  subtotal: { fontSize: 13, fontFamily: "Inter_500Medium" },
  removeBtn: { padding: 4 },
  footer: { borderTopWidth: 1, padding: 16, paddingTop: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  totalLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  totalAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  checkoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 52, borderRadius: 14, gap: 8 },
  checkoutLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
