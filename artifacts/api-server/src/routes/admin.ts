import { Router, type Request, type Response } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { db, usersTable, sellersTable, productsTable, ordersTable } from "@workspace/db";
import { count, sum, eq } from "drizzle-orm";

const router = Router();

// GET /api/admin/stats - Platform analytics
router.get("/admin/stats", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [totalUsers] = await db.select({ count: count() }).from(usersTable);
    const [totalSellers] = await db.select({ count: count() }).from(sellersTable);
    const [totalProducts] = await db.select({ count: count() }).from(productsTable);
    const [totalOrders] = await db.select({ count: count() }).from(ordersTable);
    const [totalRevenue] = await db.select({ total: sum(ordersTable.totalPrice) }).from(ordersTable);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.count,
        totalSellers: totalSellers.count,
        totalProducts: totalProducts.count,
        totalOrders: totalOrders.count,
        totalRevenue: Number(totalRevenue.total || 0),
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/admin/users - List all users
router.get("/admin/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await db.select().from(usersTable);
    res.json({ success: true, data: users.map((u: any) => ({ ...u, passwordHash: undefined })) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// PUT /api/admin/users/:userId/role - Change user role
router.put("/admin/users/:userId/role", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!["buyer", "seller", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    const [user] = await db.update(usersTable)
      .set({ role })
      .where(eq(usersTable.id, parseInt(req.params.userId as string)))
      .returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ success: true, data: { ...user, passwordHash: undefined } });
  } catch (error) {
    res.status(500).json({ error: "Failed to update role" });
  }
});

// DELETE /api/admin/products/:productId - Moderate (delete) product
router.delete("/admin/products/:productId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [deleted] = await db.delete(productsTable)
      .where(eq(productsTable.id, parseInt(req.params.productId as string)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
