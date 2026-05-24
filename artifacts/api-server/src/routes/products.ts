import { Router, type IRouter } from "express";
import { eq, like, and, desc, asc, sql, ilike } from "drizzle-orm";
import { db, productsTable, sellersTable, usersTable } from "@workspace/db";
import { requireAuth, requireSeller } from "../middlewares/auth";

const router: IRouter = Router();

const productSelect = {
  id: productsTable.id,
  sellerId: productsTable.sellerId,
  name: productsTable.name,
  category: productsTable.category,
  price: productsTable.price,
  stock: productsTable.stock,
  description: productsTable.description,
  images: productsTable.images,
  unit: productsTable.unit,
  tags: productsTable.tags,
  createdAt: productsTable.createdAt,
  sellerName: usersTable.name,
  shopName: sellersTable.shopName,
};

router.get("/products", async (req, res): Promise<void> => {
  const { category, search, sort, page = "1", limit = "20", sellerId } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(productsTable.isActive, true)];
  if (category && category !== "all") conditions.push(eq(productsTable.category, category));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (sellerId) conditions.push(eq(productsTable.sellerId, parseInt(sellerId, 10)));

  const whereClause = and(...conditions);

  let orderBy;
  switch (sort) {
    case "price_asc": orderBy = asc(productsTable.price); break;
    case "price_desc": orderBy = desc(productsTable.price); break;
    default: orderBy = desc(productsTable.createdAt);
  }

  const [products, countResult] = await Promise.all([
    db.select(productSelect).from(productsTable)
      .innerJoin(sellersTable, eq(productsTable.sellerId, sellersTable.id))
      .innerJoin(usersTable, eq(sellersTable.userId, usersTable.id))
      .where(whereClause).orderBy(orderBy).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(productsTable).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  res.json({
    products: products.map((p: any) => ({ ...p, price: Number(p.price), createdAt: p.createdAt.toISOString() })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [product] = await db.select({
    ...productSelect,
    sellerPhone: sellersTable.phone,
    sellerAddress: sellersTable.address,
    sellerWhatsapp: sellersTable.whatsappNumber,
    orderingMode: sellersTable.orderingMode,
  }).from(productsTable)
    .innerJoin(sellersTable, eq(productsTable.sellerId, sellersTable.id))
    .innerJoin(usersTable, eq(sellersTable.userId, usersTable.id))
    .where(eq(productsTable.id, id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({ ...product, price: Number(product.price), createdAt: product.createdAt.toISOString() });
});

router.post("/products", requireAuth, requireSeller, async (req, res): Promise<void> => {
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller || !seller.verified) {
    res.status(403).json({ error: "Seller not approved" });
    return;
  }
  const { name, category, price, stock, description, images, unit, tags } = req.body as {
    name: string; category: string; price: number; stock: number; description: string;
    images?: string[]; unit: string; tags?: string[];
  };
  if (!name || !category || price == null || stock == null || !description || !unit) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    sellerId: seller.id, name, category, price: price.toString(), stock,
    description, images: images ?? [], unit, tags: tags ?? [],
  }).returning();
  res.status(201).json({ ...product, price: Number(product.price), sellerName: "", shopName: seller.shopName, createdAt: product.createdAt.toISOString() });
});

router.put("/products/:id", requireAuth, requireSeller, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller) {
    res.status(403).json({ error: "Seller not found" });
    return;
  }
  const [existing] = await db.select().from(productsTable).where(and(eq(productsTable.id, id), eq(productsTable.sellerId, seller.id)));
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const { name, category, price, stock, description, images, unit, tags } = req.body as {
    name?: string; category?: string; price?: number; stock?: number; description?: string;
    images?: string[]; unit?: string; tags?: string[];
  };
  const [updated] = await db.update(productsTable).set({
    name, category, price: price?.toString(), stock, description, images, unit, tags,
  }).where(eq(productsTable.id, id)).returning();
  res.json({ ...updated, price: Number(updated.price), sellerName: "", shopName: seller.shopName, createdAt: updated.createdAt.toISOString() });
});

router.delete("/products/:id", requireAuth, requireSeller, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.userId, req.user!.userId));
  if (!seller) {
    res.status(403).json({ error: "Seller not found" });
    return;
  }
  await db.update(productsTable).set({ isActive: false }).where(and(eq(productsTable.id, id), eq(productsTable.sellerId, seller.id)));
  res.sendStatus(204);
});

export default router;
