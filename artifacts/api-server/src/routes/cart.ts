import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, cartsTable, cartItemsTable, productsTable, sellersTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getOrCreateCart(userId: number) {
  let [cart] = await db.select().from(cartsTable).where(eq(cartsTable.userId, userId));
  if (!cart) {
    [cart] = await db.insert(cartsTable).values({ userId }).returning();
  }
  return cart;
}

async function buildCartResponse(cartId: number, userId: number) {
  const cart = { id: cartId };
  const items = await db.select({
    id: cartItemsTable.id,
    productId: cartItemsTable.productId,
    quantity: cartItemsTable.quantity,
    productName: productsTable.name,
    productImage: productsTable.images,
    price: productsTable.price,
    stock: productsTable.stock,
    sellerId: productsTable.sellerId,
    sellerName: usersTable.name,
    unit: productsTable.unit,
  }).from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .innerJoin(sellersTable, eq(productsTable.sellerId, sellersTable.id))
    .innerJoin(usersTable, eq(sellersTable.userId, usersTable.id))
    .where(eq(cartItemsTable.cartId, cartId));

  const mappedItems = items.map(i => ({
    id: i.id,
    productId: i.productId,
    productName: i.productName,
    productImage: (i.productImage as string[])[0] ?? "",
    price: Number(i.price),
    quantity: i.quantity,
    stock: i.stock,
    sellerId: i.sellerId,
    sellerName: i.sellerName,
    unit: i.unit,
    subtotal: Number(i.price) * i.quantity,
  }));

  const total = mappedItems.reduce((sum, i) => sum + i.subtotal, 0);
  return { id: cart.id, items: mappedItems, total, itemCount: mappedItems.reduce((sum, i) => sum + i.quantity, 0) };
}

router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  const cart = await getOrCreateCart(req.user!.userId);
  res.json(await buildCartResponse(cart.id, req.user!.userId));
});

router.post("/cart", requireAuth, async (req, res): Promise<void> => {
  const { productId, quantity } = req.body as { productId: number; quantity: number };
  if (!productId || !quantity || quantity < 1) {
    res.status(400).json({ error: "Invalid product or quantity" });
    return;
  }
  const cart = await getOrCreateCart(req.user!.userId);
  const [existing] = await db.select().from(cartItemsTable).where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, productId)));
  if (existing) {
    await db.update(cartItemsTable).set({ quantity: existing.quantity + quantity }).where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({ cartId: cart.id, productId, quantity });
  }
  res.json(await buildCartResponse(cart.id, req.user!.userId));
});

router.put("/cart/:productId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const productId = parseInt(raw, 10);
  const { quantity } = req.body as { quantity: number };

  const cart = await getOrCreateCart(req.user!.userId);
  if (quantity <= 0) {
    await db.delete(cartItemsTable).where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, productId)));
  } else {
    await db.update(cartItemsTable).set({ quantity }).where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, productId)));
  }
  res.json(await buildCartResponse(cart.id, req.user!.userId));
});

router.delete("/cart/:productId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const productId = parseInt(raw, 10);
  const cart = await getOrCreateCart(req.user!.userId);
  await db.delete(cartItemsTable).where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, productId)));
  res.json(await buildCartResponse(cart.id, req.user!.userId));
});

router.delete("/cart", requireAuth, async (req, res): Promise<void> => {
  const cart = await getOrCreateCart(req.user!.userId);
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
  res.sendStatus(204);
});

export default router;
