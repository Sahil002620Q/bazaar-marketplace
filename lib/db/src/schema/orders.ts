import { pgTable, serial, text, integer, timestamp, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { sellersTable } from "./sellers";

export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "shipped", "delivered", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed"]);
export const orderModeEnum = pgEnum("order_mode", ["ecommerce", "whatsapp"]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  sellerId: integer("seller_id").notNull().references(() => sellersTable.id),
  items: jsonb("items").notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: jsonb("delivery_address").notNull(),
  orderMode: orderModeEnum("order_mode").notNull().default("ecommerce"),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  sellerNotes: text("seller_notes"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true, deliveredAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
