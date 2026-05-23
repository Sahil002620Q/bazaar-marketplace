import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "pickles", label: "Pickles" },
  { id: "chawal_badi", label: "Chawal Badi" },
  { id: "roohafza", label: "Roohafza" },
  { id: "woolen_clothes", label: "Woolen Clothes" },
  { id: "keychains", label: "Keychains" },
  { id: "other", label: "Other" },
];

interface Props {
  category: { id: string; label: string };
  selected: boolean;
  onPress: () => void;
}

export function CategoryChip({ category, selected, onPress }: Props) {
  const colors = useColors();
  return (
    <Pressable
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.label, { color: selected ? colors.primaryForeground : colors.foreground }]}>
        {category.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    whiteSpace: "nowrap",
  } as never,
});
