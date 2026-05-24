import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, addressesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const addresses = await db.select().from(addressesTable).where(eq(addressesTable.userId, user.id));
  res.json({
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    role: user.role, sellerApproved: user.sellerApproved,
    addresses: addresses.map((a: any) => ({ ...a, isDefault: a.isDefault })),
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const { name, phone } = req.body as { name?: string; phone?: string };
  const updates: { name?: string; phone?: string } = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.userId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const addresses = await db.select().from(addressesTable).where(eq(addressesTable.userId, updated.id));
  res.json({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, role: updated.role, sellerApproved: updated.sellerApproved, addresses, createdAt: updated.createdAt.toISOString() });
});

router.get("/users/addresses", requireAuth, async (req, res): Promise<void> => {
  const addresses = await db.select().from(addressesTable).where(eq(addressesTable.userId, req.user!.userId));
  res.json(addresses);
});

router.post("/users/addresses", requireAuth, async (req, res): Promise<void> => {
  const { name, street, city, state, zipCode, phone, isDefault } = req.body as {
    name: string; street: string; city: string; state: string; zipCode: string; phone: string; isDefault?: boolean;
  };
  if (!name || !street || !city || !state || !zipCode || !phone) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, req.user!.userId));
  }
  const [addr] = await db.insert(addressesTable).values({ userId: req.user!.userId, name, street, city, state, zipCode, phone, isDefault: isDefault ?? false }).returning();
  res.status(201).json(addr);
});

router.put("/users/addresses/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, street, city, state, zipCode, phone, isDefault } = req.body as {
    name?: string; street?: string; city?: string; state?: string; zipCode?: string; phone?: string; isDefault?: boolean;
  };
  if (isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, req.user!.userId));
  }
  const [addr] = await db.update(addressesTable).set({ name, street, city, state, zipCode, phone, isDefault }).where(eq(addressesTable.id, id)).returning();
  if (!addr) {
    res.status(404).json({ error: "Address not found" });
    return;
  }
  res.json(addr);
});

router.delete("/users/addresses/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(addressesTable).where(eq(addressesTable.id, id));
  res.sendStatus(204);
});

export default router;
