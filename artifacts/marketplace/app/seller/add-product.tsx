import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIES } from "@/components/CategoryChip";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = (() => { const d = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080"; return `${d.startsWith("localhost") ? "http" : "https"}://${d}`; })();
const UNITS = ["pcs", "kg", "g", "litre", "ml", "bottle", "box", "pack", "pair"];

export default function AddProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("pickles");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0);

  const handleSave = async () => {
    if (!name || !price || !stock || !description) {
      Alert.alert("Missing Fields", "Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        category,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        description: description.trim(),
        unit,
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        tags: tags.trim() ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      const res = await fetch(`${API_BASE}/api/products${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.back();
      } else {
        const data = await res.json();
        Alert.alert("Error", data.message ?? data.error ?? "Failed to save product");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{id ? "Edit Product" : "Add Product"}</Text>
        <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : (
            <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]}>
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Product Name *</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            placeholder="e.g., Mango Pickle, Woolen Scarf"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {CATEGORIES.filter(c => c.id !== "all").map(cat => (
              <Pressable
                key={cat.id}
                style={[styles.chip, { backgroundColor: category === cat.id ? colors.primary : colors.card, borderColor: category === cat.id ? colors.primary : colors.border }]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={[styles.chipLabel, { color: category === cat.id ? colors.primaryForeground : colors.foreground }]}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Price & Stock */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Price (₹) *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Stock *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Unit */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {UNITS.map(u => (
              <Pressable
                key={u}
                style={[styles.chip, { backgroundColor: unit === u ? colors.primary : colors.card, borderColor: unit === u ? colors.primary : colors.border }]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.chipLabel, { color: unit === u ? colors.primaryForeground : colors.foreground }]}>{u}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Description *</Text>
          <TextInput
            style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            placeholder="Describe your product..."
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Image URL */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Image URL</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            placeholder="https://..."
            placeholderTextColor={colors.mutedForeground}
            value={imageUrl}
            onChangeText={setImageUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Tags */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Tags (comma separated)</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            placeholder="homemade, spicy, gift"
            placeholderTextColor={colors.mutedForeground}
            value={tags}
            onChangeText={setTags}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 56, alignItems: "center" },
  saveLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, gap: 20 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", height: 120, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  chips: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
