import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { signToken } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { name, email, phone } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const [user] = await db.insert(usersTable).values({ name, email, phone, role: "buyer" }).returning();
  const token = signToken({ userId: user.id, role: user.role });
  req.log.info({ userId: user.id }, "User registered");
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, sellerApproved: user.sellerApproved, createdAt: user.createdAt.toISOString() } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { email } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "No account found with this email" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  req.log.info({ userId: user.id }, "User logged in");
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, sellerApproved: user.sellerApproved, createdAt: user.createdAt.toISOString() } });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, sellerApproved: user.sellerApproved, createdAt: user.createdAt.toISOString() });
});

export default router;
