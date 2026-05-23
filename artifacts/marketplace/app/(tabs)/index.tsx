import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryChip, CATEGORIES } from "@/components/CategoryChip";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/SkeletonLoader";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface ProductListResponse {
  products: ProductCardData[];
  total: number;
  page: number;
  totalPages: number;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchProducts = useCallback(async (pageNum: number, reset = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "20",
        sort,
        ...(category !== "all" && { category }),
        ...(search.trim() && { search: search.trim() }),
      });
      const res = await fetch(`${API_BASE}/api/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ProductListResponse = await res.json();
      if (reset || pageNum === 1) {
        setProducts(data.products);
      } else {
        setProducts(prev => [...prev, ...data.products]);
      }
      setTotalPages(data.totalPages);
      setPage(pageNum);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [category, search, sort]);

  useEffect(() => {
    fetchProducts(1, true);
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1, true);
  }, [fetchProducts]);

  const loadMore = useCallback(() => {
    if (!loadingMore && page < totalPages) {
      fetchProducts(page + 1);
    }
  }, [loadingMore, page, totalPages, fetchProducts]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Bazaar</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Homemade & handcrafted</Text>
          </View>
          <Pressable style={[styles.searchIcon, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search products or sellers..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={text => { setSearch(text); }}
            onSubmitEditing={() => fetchProducts(1, true)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(""); }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map(cat => (
            <CategoryChip
              key={cat.id}
              category={cat}
              selected={category === cat.id}
              onPress={() => setCategory(cat.id)}
            />
          ))}
        </ScrollView>

        {/* Sort */}
        <View style={styles.sortRow}>
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {products.length > 0 ? `${products.length}+ products` : ""}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptions}>
            {([["newest", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"]] as const).map(([s, label]) => (
              <Pressable
                key={s}
                style={[styles.sortChip, { backgroundColor: sort === s ? colors.primary : colors.card, borderColor: sort === s ? colors.primary : colors.border }]}
                onPress={() => setSort(s)}
              >
                <Text style={[styles.sortLabel, { color: sort === s ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Product Grid */}
      {loading ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.gridItem}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <ProductCard product={item} />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="basket-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try adjusting your filters</Text>
            </View>
          }
          scrollEnabled={!!products.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  searchIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  searchBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 46,
    borderRadius: 14, borderWidth: 1, gap: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  categories: { paddingBottom: 10 },
  sortRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, paddingBottom: 4 },
  resultCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sortOptions: { flexDirection: "row", gap: 6 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  sortLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { padding: 12 },
  row: { justifyContent: "space-between" },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 12 },
  gridItem: { width: "50%" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 8, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
