import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";

interface ProductDetail {
  id: number; name: string; category: string; price: number; stock: number;
  description: string; images: string[]; unit: string; tags: string[];
  sellerName: string; shopName: string; sellerPhone: string;
  sellerAddress: string; sellerWhatsapp: string; orderingMode: string;
  sellerId: number; createdAt: string;
}

const API_BASE = (() => { const d = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080"; return `${d.startsWith("localhost") ? "http" : "https"}://${d}`; })();

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/${id}`);
        const data = await res.json();
        if (res.ok) setProduct(data);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] ?? "",
      price: product.price,
      quantity,
      stock: product.stock,
      sellerId: product.sellerId,
      sellerName: product.shopName,
      unit: product.unit,
    });
    router.back();
  };

  const handleWhatsApp = () => {
    if (!product) return;
    const phone = product.sellerWhatsapp ?? product.sellerPhone;
    const msg = encodeURIComponent(`Hi, I'm interested in your product: *${product.name}* (₹${product.price}/${product.unit})`);
    Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${msg}`);
  };

  const bottomPad = Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Product not found</Text>
        <Pressable onPress={() => router.back()}><Text style={[{ color: colors.primary }]}>Go back</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + bottomPad }}>
        {/* Image */}
        <View style={[styles.imageContainer, { backgroundColor: colors.muted }]}>
          {product.images.length > 0 ? (
            <Image source={{ uri: product.images[imageIndex] }} style={styles.image} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={64} color={colors.mutedForeground} />
          )}
          {/* Back button */}
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.card + "CC", top: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </Pressable>

          {/* Image dots */}
          {product.images.length > 1 && (
            <View style={styles.dots}>
              {product.images.map((_, i) => (
                <Pressable
                  key={i}
                  style={[styles.dot, { backgroundColor: i === imageIndex ? colors.primary : colors.border }]}
                  onPress={() => setImageIndex(i)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Category + stock */}
          <View style={styles.topRow}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.categoryLabel, { color: colors.primary }]}>{product.category}</Text>
            </View>
            <Text style={[styles.stock, { color: product.stock > 0 ? colors.success : colors.destructive }]}>
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </Text>
          </View>

          <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>₹{product.price.toFixed(0)} <Text style={[styles.unit, { color: colors.mutedForeground }]}>/ {product.unit}</Text></Text>

          {/* Seller */}
          <View style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sellerAvatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.sellerAvatarText, { color: colors.primaryForeground }]}>
                {(product.shopName || product.sellerName).charAt(0)}
              </Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={[styles.shopName, { color: colors.foreground }]}>{product.shopName}</Text>
              <Text style={[styles.sellerSub, { color: colors.mutedForeground }]}>{product.sellerAddress}</Text>
            </View>
            {(product.sellerWhatsapp || product.sellerPhone) && (
              <Pressable style={[styles.whatsappBtn, { backgroundColor: "#25D366" }]} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          {/* Description */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Description</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{product.description}</Text>

          {/* Tags */}
          {product.tags.length > 0 && (
            <View style={styles.tags}>
              {product.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad }]}>
        <View style={styles.qtyControl}>
          <Pressable
            style={[styles.qtyBtn, { backgroundColor: colors.muted }]}
            onPress={() => setQuantity(q => Math.max(1, q - 1))}
          >
            <Ionicons name="remove" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.qtyText, { color: colors.foreground }]}>{quantity}</Text>
          <Pressable
            style={[styles.qtyBtn, { backgroundColor: colors.muted }]}
            onPress={() => setQuantity(q => Math.min(product.stock, q + 1))}
          >
            <Ionicons name="add" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.addToCartBtn, { backgroundColor: product.stock > 0 ? colors.primary : colors.muted, flex: 1 }]}
          onPress={handleAddToCart}
          disabled={product.stock === 0}
        >
          <Ionicons name="cart-outline" size={20} color={product.stock > 0 ? colors.primaryForeground : colors.mutedForeground} />
          <Text style={[styles.addToCartLabel, { color: product.stock > 0 ? colors.primaryForeground : colors.mutedForeground }]}>
            {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  imageContainer: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  image: { width: "100%", height: "100%" },
  backBtn: { position: "absolute", left: 16, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dots: { position: "absolute", bottom: 16, flexDirection: "row", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { padding: 16, gap: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  categoryLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  stock: { fontSize: 13, fontFamily: "Inter_500Medium" },
  productName: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 28 },
  price: { fontSize: 26, fontFamily: "Inter_700Bold" },
  unit: { fontSize: 14, fontFamily: "Inter_400Regular" },
  sellerCard: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 12 },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sellerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sellerInfo: { flex: 1 },
  shopName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sellerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  whatsappBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tagText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 18, fontFamily: "Inter_700Bold", minWidth: 28, textAlign: "center" },
  addToCartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 52, borderRadius: 14, gap: 8 },
  addToCartLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
