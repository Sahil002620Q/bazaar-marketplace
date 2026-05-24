import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, ordersTable, usersTable, sellersTable, productsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function genOrderId() {
  return "ORD-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function formatOrder(o: typeof ordersTable.$inferSelect, buyerName: string, sellerName: string, shopName: string, sellerWhatsapp?: string) {
  return {
    id: o.id,
    orderId: o.orderId,
    buyerId: o.buyerId,
    sellerId: o.sellerId,
    buyerName,
    sellerName,
    shopName,
    sellerWhatsapp,
    items: o.items as Array<{ productId: number; productName: string; quantity: number; price: number; subtotal: number; unit: string }>,
    totalPrice: Number(o.totalPrice),
    deliveryAddress: o.deliveryAddress as { name: string; street: string; city: string; state: string; zipCode: string; phone: string },
    orderMode: o.orderMode,
    status: o.status,
    paymentMethod: o.paymentMethod ?? undefined,
    paymentStatus: o.paymentStatus,
    sellerNotes: o.sellerNotes ?? undefined,
    trackingNumber: o.trackingNumber ?? undefined,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const { sellerId, items, deliveryAddress, orderMode, paymentMethod } = req.body as {
    sellerId: number;
    items: Array<{ productId: number; quantity: number }>;
    deliveryAddress: { name: string; street: string; city: string; state: string; zipCode: string; phone: string };
    orderMode: "ecommerce" | "whatsapp";
    paymentMethod?: string;
  };

  if (!sellerId || !items?.length || !deliveryAddress || !orderMode) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [seller] = await db.select({ s: sellersTable, u: usersTable })
    .from(sellersTable).innerJoin(usersTable, eq(sellersTable.userId, usersTable.id))
    .where(eq(sellersTable.id, sellerId));
  if (!seller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }

  let totalPrice = 0;
  const orderItems = [];
  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const price = Number(product.price);
    const subtotal = price * item.quantity;
    totalPrice += subtotal;
    orderItems.push({ productId: product.id, productName: product.name, quantity: item.quantity, price, subtotal, unit: product.unit });
  }

  const [order] = await db.insert(ordersTable).values({
    orderId: genOrderId(),
    buyerId: req.user!.userId,
    sellerId,
    items: orderItems,
    totalPrice: totalPrice.toString(),
    deliveryAddress,
    orderMode,
    paymentMethod,
    status: "pending",
    paymentStatus: "pending",
  }).returning();

  res.status(201).json(formatOrder(order, buyer?.name ?? "", seller.u.name, seller.s.shopName, seller.s.whatsappNumber ?? ""));
});

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const { status, page = "1" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = 20;
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(ordersTable.buyerId, req.user!.userId)];
  if (status && status !== "all") conditions.push(eq(ordersTable.status, status as "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"));

  const orders = await db.select({
    order: ordersTable,
    buyerName: usersTable.name,
    sellerName: sql<string>`seller_user.name`,
    shopName: sellersTable.shopName,
  }).from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .innerJoin(sellersTable, eq(ordersTable.sellerId, sellersTable.id))
    .innerJoin(sql`users seller_user`, sql`seller_user.id = ${sellersTable.userId}`)
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limitNum).offset(offset);

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(and(...conditions));
  const total = Number(countResult?.count ?? 0);

  res.json({
    orders: orders.map((r: any) => formatOrder(r.order, r.buyerName, r.sellerName, r.shopName)),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [result] = await db.select({
    order: ordersTable,
    buyerName: usersTable.name,
    sellerName: sql<string>`seller_user.name`,
    shopName: sellersTable.shopName,
  }).from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .innerJoin(sellersTable, eq(ordersTable.sellerId, sellersTable.id))
    .innerJoin(sql`users seller_user`, sql`seller_user.id = ${sellersTable.userId}`)
    .where(eq(ordersTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (result.order.buyerId !== req.user!.userId && req.user!.role !== "admin") {
    const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
    if (!seller || seller.id !== result.order.sellerId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  res.json(formatOrder(result.order, result.buyerName, result.sellerName, result.shopName));
});

router.put("/orders/:id/status", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status, sellerNotes, trackingNumber } = req.body as { status: string; sellerNotes?: string; trackingNumber?: string };

  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller) {
    res.status(403).json({ error: "Seller access required" });
    return;
  }

  const updates: Record<string, unknown> = { status };
  if (sellerNotes != null) updates.sellerNotes = sellerNotes;
  if (trackingNumber != null) updates.trackingNumber = trackingNumber;
  if (status === "delivered") updates.deliveredAt = new Date();

  const [updated] = await db.update(ordersTable).set(updates as Parameters<typeof ordersTable.$inferSelect extends unknown ? never : never>[0]).where(and(eq(ordersTable.id, id), eq(ordersTable.sellerId, seller.id))).returning();
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [sellerUser] = await db.select().from(usersTable).where(eq(usersTable.id, seller.userId));
  res.json(formatOrder(updated, buyer?.name ?? "", sellerUser?.name ?? "", seller.shopName));
});

router.put("/orders/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.buyerId !== req.user!.userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (order.status === "delivered") {
    res.status(400).json({ error: "Cannot cancel a delivered order" });
    return;
  }

  const [updated] = await db.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, id)).returning();
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ s: sellersTable, u: usersTable }).from(sellersTable).innerJoin(usersTable, eq(sellersTable.userId, usersTable.id)).where(eq(sellersTable.id, updated.sellerId));
  res.json(formatOrder(updated, buyer?.name ?? "", seller?.u.name ?? "", seller?.s.shopName ?? ""));
});

export default router;
