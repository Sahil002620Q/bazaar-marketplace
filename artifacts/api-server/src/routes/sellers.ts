import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, sellersTable, usersTable, productsTable, ordersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function formatSeller(s: typeof sellersTable.$inferSelect, u: typeof usersTable.$inferSelect, totalProducts = 0, totalOrders = 0) {
  return {
    id: s.id, userId: s.userId, shopName: s.shopName, phone: s.phone, address: s.address,
    orderingMode: s.orderingMode, whatsappNumber: s.whatsappNumber ?? undefined,
    paymentMethods: s.paymentMethods, verified: s.verified,
    userName: u.name, userEmail: u.email,
    totalProducts, totalOrders,
    createdAt: s.createdAt.toISOString(),
  };
}

// Admin: list all sellers
router.get("/sellers", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const sellers = await db.select({ s: sellersTable, u: usersTable })
    .from(sellersTable)
    .innerJoin(usersTable, eq(sellersTable.userId, usersTable.id))
    .orderBy(desc(sellersTable.createdAt));

  const result = await Promise.all(sellers.map(async ({ s, u }: any) => {
    const [[{ count: tp }], [{ count: to }]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(productsTable).where(eq(productsTable.sellerId, s.id)),
      db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(eq(ordersTable.sellerId, s.id)),
    ]);
    return formatSeller(s, u, Number(tp), Number(to));
  }));
  res.json({ sellers: result });
});

router.get("/sellers/dashboard", requireAuth, async (req, res): Promise<void> => {
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller) {
    res.status(404).json({ error: "Seller profile not found" });
    return;
  }

  const [[{ count: totalProducts }], [{ count: totalOrders }], [{ count: pendingOrders }], [{ sum: totalRevenue }]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(productsTable).where(and(eq(productsTable.sellerId, seller.id), eq(productsTable.isActive, true))),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(eq(ordersTable.sellerId, seller.id)),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(and(eq(ordersTable.sellerId, seller.id), eq(ordersTable.status, "pending"))),
    db.select({ sum: sql<number>`coalesce(sum(total_price), 0)` }).from(ordersTable).where(and(eq(ordersTable.sellerId, seller.id), eq(ordersTable.status, "delivered"))),
  ]);

  const recentOrders = await db.select({
    order: ordersTable,
    buyerName: usersTable.name,
  }).from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .where(eq(ordersTable.sellerId, seller.id))
    .orderBy(desc(ordersTable.createdAt)).limit(5);

  const [sellerUser] = await db.select().from(usersTable).where(eq(usersTable.id, seller.userId));

  res.json({
    sellerId: seller.id,
    totalProducts: Number(totalProducts ?? 0),
    totalOrders: Number(totalOrders ?? 0),
    pendingOrders: Number(pendingOrders ?? 0),
    totalRevenue: Number(totalRevenue ?? 0),
    orderingMode: seller.orderingMode,
    recentOrders: recentOrders.map((r: any) => ({
      id: r.order.id, orderId: r.order.orderId, buyerId: r.order.buyerId, sellerId: r.order.sellerId,
      buyerName: r.buyerName, sellerName: sellerUser?.name ?? "", shopName: seller.shopName,
      items: r.order.items as never[], totalPrice: Number(r.order.totalPrice),
      deliveryAddress: r.order.deliveryAddress as never,
      orderMode: r.order.orderMode, status: r.order.status, paymentStatus: r.order.paymentStatus,
      createdAt: r.order.createdAt.toISOString(), updatedAt: r.order.updatedAt.toISOString(),
    })),
  });
});

router.get("/sellers/profile", requireAuth, async (req, res): Promise<void> => {
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller) {
    res.status(404).json({ error: "No seller profile found" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, seller.userId));
  const [[{ count: totalProducts }], [{ count: totalOrders }]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(productsTable).where(eq(productsTable.sellerId, seller.id)),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(eq(ordersTable.sellerId, seller.id)),
  ]);
  res.json(formatSeller(seller, user!, Number(totalProducts), Number(totalOrders)));
});

router.post("/sellers/profile", requireAuth, async (req, res): Promise<void> => {
  const [existing] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (existing) {
    res.status(409).json({ error: "Seller profile already exists" });
    return;
  }
  const { shopName, phone, address, orderingMode, whatsappNumber, paymentMethods } = req.body as {
    shopName: string; phone: string; address: string; orderingMode: "ecommerce" | "whatsapp";
    whatsappNumber?: string; paymentMethods?: string[];
  };
  if (!shopName || !phone || !address || !orderingMode) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [seller] = await db.insert(sellersTable).values({
    userId: req.user!.userId, shopName, phone, address, orderingMode,
    whatsappNumber, paymentMethods: paymentMethods ?? ["cod"],
  }).returning();
  if (req.user!.role !== "admin") {
    await db.update(usersTable).set({ role: "seller" }).where(eq(usersTable.id, req.user!.userId));
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, seller.userId));
  res.status(201).json(formatSeller(seller, user!));
});

router.put("/sellers/profile", requireAuth, async (req, res): Promise<void> => {
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller) {
    res.status(404).json({ error: "Seller profile not found" });
    return;
  }
  const { shopName, phone, address, orderingMode, whatsappNumber, paymentMethods } = req.body as {
    shopName?: string; phone?: string; address?: string; orderingMode?: "ecommerce" | "whatsapp";
    whatsappNumber?: string; paymentMethods?: string[];
  };
  const [updated] = await db.update(sellersTable).set({ shopName, phone, address, orderingMode, whatsappNumber, paymentMethods }).where(eq(sellersTable.id, seller.id)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
  res.json(formatSeller(updated, user!));
});

router.get("/sellers/orders", requireAuth, async (req, res): Promise<void> => {
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  const { status, page = "1" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = 20;
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(ordersTable.sellerId, seller.id)];
  if (status && status !== "all") conditions.push(eq(ordersTable.status, status as "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"));

  const orders = await db.select({
    order: ordersTable,
    buyerName: usersTable.name,
  }).from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limitNum).offset(offset);

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(and(...conditions));
  const total = Number(countResult?.count ?? 0);
  const [sellerUser] = await db.select().from(usersTable).where(eq(usersTable.id, seller.userId));

  res.json({
    orders: orders.map((r: any) => ({
      id: r.order.id, orderId: r.order.orderId, buyerId: r.order.buyerId, sellerId: r.order.sellerId,
      buyerName: r.buyerName, sellerName: sellerUser?.name ?? "", shopName: seller.shopName,
      items: r.order.items as never[], totalPrice: Number(r.order.totalPrice),
      deliveryAddress: r.order.deliveryAddress as never,
      orderMode: r.order.orderMode, status: r.order.status, paymentStatus: r.order.paymentStatus,
      sellerNotes: r.order.sellerNotes ?? undefined, trackingNumber: r.order.trackingNumber ?? undefined,
      createdAt: r.order.createdAt.toISOString(), updatedAt: r.order.updatedAt.toISOString(),
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get("/sellers/sales-history", requireAuth, async (req, res): Promise<void> => {
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  const orders = await db.select({ order: ordersTable, buyerName: usersTable.name })
    .from(ordersTable).innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .where(eq(ordersTable.sellerId, seller.id)).orderBy(desc(ordersTable.createdAt)).limit(100);

  const delivered = orders.filter((o: any) => o.order.status === "delivered");
  const totalSales = delivered.reduce((sum: any, o: any) => sum + Number(o.order.totalPrice), 0);
  const [sellerUser] = await db.select().from(usersTable).where(eq(usersTable.id, seller.userId));

  const productCounts: Record<string, number> = {};
  delivered.forEach((o: any) => {
    const items = o.order.items as any[];
    items.forEach(item => {
      productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
    });
  });
  let mostSoldProduct = "None";
  let maxCount = 0;
  for (const [name, count] of Object.entries(productCounts)) {
    if (count > maxCount) {
      mostSoldProduct = name;
      maxCount = count;
    }
  }

  res.json({
    totalSales,
    totalOrders: orders.length,
    avgOrderValue: delivered.length > 0 ? totalSales / delivered.length : 0,
    mostSoldProduct,
    orders: orders.map((r: any) => ({
      id: r.order.id, orderId: r.order.orderId, buyerId: r.order.buyerId, sellerId: r.order.sellerId,
      buyerName: r.buyerName, sellerName: sellerUser?.name ?? "", shopName: seller.shopName,
      items: r.order.items as never[], totalPrice: Number(r.order.totalPrice),
      deliveryAddress: r.order.deliveryAddress as never,
      orderMode: r.order.orderMode, status: r.order.status, paymentStatus: r.order.paymentStatus,
      createdAt: r.order.createdAt.toISOString(), updatedAt: r.order.updatedAt.toISOString(),
    })),
  });
});

router.put("/sellers/approve/:userId", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const targetUserId = parseInt(raw, 10);

  const [updated] = await db.update(sellersTable).set({ verified: true }).where(eq(sellersTable.userId, targetUserId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
  if (user && user.role !== "admin") {
    await db.update(usersTable).set({ sellerApproved: true, role: "seller" }).where(eq(usersTable.id, targetUserId));
  } else {
    await db.update(usersTable).set({ sellerApproved: true }).where(eq(usersTable.id, targetUserId));
  }
  res.json(formatSeller(updated, user!));
});

router.get("/sellers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.id, id));
  if (!seller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, seller.userId));
  const [[{ count: totalProducts }], [{ count: totalOrders }]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(productsTable).where(eq(productsTable.sellerId, seller.id)),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(eq(ordersTable.sellerId, seller.id)),
  ]);
  res.json(formatSeller(seller, user!, Number(totalProducts), Number(totalOrders)));
});

export default router;
