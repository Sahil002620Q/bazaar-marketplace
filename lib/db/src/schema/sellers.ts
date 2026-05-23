import { pgTable, serial, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const orderingModeEnum = pgEnum("ordering_mode", ["ecommerce", "whatsapp"]);

export const sellersTable = pgTable("sellers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  shopName: text("shop_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  orderingMode: orderingModeEnum("ordering_mode").notNull().default("ecommerce"),
  whatsappNumber: text("whatsapp_number"),
  paymentMethods: text("payment_methods").array().notNull().default(["cod"]),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSellerSchema = createInsertSchema(sellersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type Seller = typeof sellersTable.$inferSelect;
