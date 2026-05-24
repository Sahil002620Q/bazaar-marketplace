import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { signToken } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hashed, "hex");
  return timingSafeEqual(buf, storedBuf);
}

const router: IRouter = Router();

function userResponse(user: typeof usersTable.$inferSelect) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone ?? "", role: user.role, sellerApproved: user.sellerApproved, createdAt: user.createdAt.toISOString() };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { name, email, phone, password } = parsed.data;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ name, email, phone: phone ?? "", passwordHash, role: "buyer" }).returning();
  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({ token, user: userResponse(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "No account found with this email" });
    return;
  }
  // Users without a password hash (legacy or admin-created) cannot use password login
  if (!user.passwordHash) {
    res.status(401).json({ error: "Unauthorized", message: "This account has no password set. Please use a different sign-in method." });
    return;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Incorrect password" });
    return;
  }
  const token = signToken({ userId: user.id, role: user.role });
  res.json({ token, user: userResponse(user) });
});

// Google OAuth — accepts a Google access_token, fetches profile, finds-or-creates user
router.post("/auth/google", async (req, res): Promise<void> => {
  const { accessToken } = req.body as { accessToken?: string };
  if (!accessToken) {
    res.status(400).json({ error: "accessToken is required" });
    return;
  }
  try {
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!googleRes.ok) {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }
    const gUser = await googleRes.json() as { id: string; email: string; name: string; picture?: string };

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, gUser.email));
    if (!user) {
      [user] = await db.insert(usersTable).values({
        name: gUser.name,
        email: gUser.email,
        phone: "",
        role: "buyer",
      }).returning();
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: userResponse(user) });
  } catch (e) {
    res.status(500).json({ error: "Google auth failed" });
  }
});

// Make admin — protected by ADMIN_SETUP_KEY env var (one-time use to bootstrap admin)
router.post("/auth/make-admin", async (req, res): Promise<void> => {
  const { email, setupKey } = req.body as { email?: string; setupKey?: string };
  const expectedKey = process.env.ADMIN_SETUP_KEY;
  if (!expectedKey || setupKey !== expectedKey) {
    res.status(403).json({ error: "Invalid setup key" });
    return;
  }
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(404).json({ error: "User not found — register first, then call this endpoint" });
    return;
  }
  const [updated] = await db.update(usersTable)
    .set({ role: "admin", sellerApproved: true })
    .where(eq(usersTable.email, email))
    .returning();
  const token = signToken({ userId: updated.id, role: updated.role });
  res.json({ message: "Admin created successfully", token, user: userResponse(updated) });
});

// Set/reset password for an existing user (admin use via make-admin flow)
router.post("/auth/set-password", async (req, res): Promise<void> => {
  const { email, setupKey, password } = req.body as { email?: string; setupKey?: string; password?: string };
  const expectedKey = process.env.ADMIN_SETUP_KEY;
  if (!expectedKey || setupKey !== expectedKey) {
    res.status(403).json({ error: "Invalid setup key" });
    return;
  }
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [updated] = await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.email, email)).returning();
  res.json({ message: "Password set successfully", user: userResponse(updated) });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(userResponse(user));
});

export default router;
