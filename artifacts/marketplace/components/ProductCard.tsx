import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";

export interface ProductCardData {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  images: string[];
  sellerName: string;
  shopName: string;
  sellerId: number;
  unit: string;
  description: string;
}

interface Props {
  product: ProductCardData;
}

const CATEGORIES: Record<string, string> = {
  pickles: "Pickles",
  chawal_badi: "Chawal Badi",
  roohafza: "Roohafza",
  woolen_clothes: "Woolen Clothes",
  keychains: "Keychains",
  other: "Other",
};

export function ProductCard({ product }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { addItem } = useCart();

  const handleAddToCart = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] ?? "",
      price: product.price,
      quantity: 1,
      stock: product.stock,
      sellerId: product.sellerId,
      sellerName: product.shopName || product.sellerName,
      unit: product.unit,
    });
  };

  const isOutOfStock = product.stock === 0;
  const imageUri = product.images[0];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.muted }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
            <Ionicons name="image-outline" size={32} color={colors.mutedForeground} />
          </View>
        )}
        {isOutOfStock && (
          <View style={[styles.outOfStockBadge, { backgroundColor: colors.destructive }]}>
            <Text style={[styles.outOfStockText, { color: colors.destructiveForeground }]}>Out of Stock</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.category, { color: colors.primary }]} numberOfLines={1}>
          {CATEGORIES[product.category] ?? product.category}
        </Text>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.seller, { color: colors.mutedForeground }]} numberOfLines={1}>
          {product.shopName || product.sellerName}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.price, { color: colors.primary }]}>
            ₹{product.price.toFixed(0)}
            <Text style={[styles.unit, { color: colors.mutedForeground }]}> /{product.unit}</Text>
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: isOutOfStock ? colors.muted : colors.primary, opacity: isOutOfStock ? 0.5 : 1 }]}
            onPress={handleAddToCart}
            disabled={isOutOfStock}
          >
            <Ionicons name="add" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flex: 1,
    margin: 4,
  },
  imageContainer: {
    aspectRatio: 1,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    padding: 10,
    gap: 4,
  },
  category: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  seller: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  price: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  unit: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
