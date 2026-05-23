import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Status = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

const STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#FFF3E0", color: "#E65100" },
  confirmed: { label: "Confirmed", bg: "#E3F2FD", color: "#1565C0" },
  shipped: { label: "Shipped", bg: "#EDE7F6", color: "#4527A0" },
  delivered: { label: "Delivered", bg: "#E8F5E9", color: "#2E7D32" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", color: "#C62828" },
};

const DARK_STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#3E2723", color: "#FFA726" },
  confirmed: { label: "Confirmed", bg: "#0D1B2A", color: "#42A5F5" },
  shipped: { label: "Shipped", bg: "#1A0D2E", color: "#CE93D8" },
  delivered: { label: "Delivered", bg: "#0A1F0A", color: "#66BB6A" },
  cancelled: { label: "Cancelled", bg: "#2C0A0A", color: "#EF9A9A" },
};

interface Props {
  status: string;
  dark?: boolean;
}

export function OrderStatusBadge({ status, dark = true }: Props) {
  const config = (dark ? DARK_STATUS_CONFIG : STATUS_CONFIG)[status as Status] ?? {
    label: status, bg: "#424242", color: "#FFFFFF",
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
