import { Router, Request, Response } from "express";
import { query } from "../db/index.js";
import { categorySchema, menuItemSchema } from "../lib/validation.js";
import { requireStaff } from "../middleware/auth.js";

const router = Router();

// Guest & public menu
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const catRes = await query(
      "SELECT id, name, description, sort_order FROM menu_categories WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC"
    );

    const itemsRes = await query(`
      SELECT m.id, m.category_id, m.name, m.description, m.price, m.image_url,
             m.dietary_flags, m.available, m.sort_order, m.prep_time_minutes
      FROM menu_items m
      JOIN menu_categories c ON m.category_id = c.id
      WHERE m.available = TRUE AND c.is_active = TRUE
      ORDER BY m.sort_order ASC, m.id ASC
    `);

    const modRes = await query(
      "SELECT id, menu_item_id, group_name, name, price_delta, is_default FROM item_modifiers ORDER BY id ASC"
    );

    const modifiersByItem: Record<number, any[]> = {};
    for (const mod of modRes.rows) {
      if (!modifiersByItem[mod.menu_item_id]) {
        modifiersByItem[mod.menu_item_id] = [];
      }
      modifiersByItem[mod.menu_item_id].push({
        id: mod.id,
        groupName: mod.group_name,
        name: mod.name,
        priceDelta: Number(mod.price_delta),
        isDefault: mod.is_default,
      });
    }

    const items = itemsRes.rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      imageUrl: row.image_url,
      dietaryFlags: row.dietary_flags || [],
      available: row.available,
      sortOrder: row.sort_order,
      prepTimeMinutes: row.prep_time_minutes,
      modifiers: modifiersByItem[row.id] || [],
    }));

    res.json({
      categories: catRes.rows,
      items,
    });
  } catch (err) {
    console.error("[Menu] fetch error:", err);
    res.status(500).json({ error: "Failed to load menu" });
  }
});

// Staff / Admin: View full menu with unavailable items
router.get("/admin", requireStaff(["admin", "staff"]), async (_req: Request, res: Response): Promise<void> => {
  try {
    const catRes = await query("SELECT * FROM menu_categories ORDER BY sort_order ASC, id ASC");
    const itemsRes = await query("SELECT * FROM menu_items ORDER BY category_id ASC, sort_order ASC, id ASC");
    const modRes = await query("SELECT * FROM item_modifiers ORDER BY id ASC");

    const modifiersByItem: Record<number, any[]> = {};
    for (const mod of modRes.rows) {
      if (!modifiersByItem[mod.menu_item_id]) {
        modifiersByItem[mod.menu_item_id] = [];
      }
      modifiersByItem[mod.menu_item_id].push({
        id: mod.id,
        groupName: mod.group_name,
        name: mod.name,
        priceDelta: Number(mod.price_delta),
        isDefault: mod.is_default,
      });
    }

    const items = itemsRes.rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      imageUrl: row.image_url,
      dietaryFlags: row.dietary_flags || [],
      available: row.available,
      sortOrder: row.sort_order,
      prepTimeMinutes: row.prep_time_minutes,
      modifiers: modifiersByItem[row.id] || [],
    }));

    res.json({ categories: catRes.rows, items });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin menu" });
  }
});

// Admin: Create Category
router.post("/categories", requireStaff(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const parse = categorySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { name, description, sortOrder } = parse.data;
  const staff = req.staff!;

  try {
    const result = await query(
      "INSERT INTO menu_categories (property_id, name, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING *",
      [staff.propertyId, name.trim(), description?.trim() || null, sortOrder]
    );
    res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

// Admin: Create Item
router.post("/items", requireStaff(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const parse = menuItemSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { categoryId, name, description, price, imageUrl, dietaryFlags, available, sortOrder, prepTimeMinutes } = parse.data;
  const staff = req.staff!;

  try {
    const result = await query(
      `INSERT INTO menu_items (property_id, category_id, name, description, price, image_url, dietary_flags, available, sort_order, prep_time_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        staff.propertyId,
        categoryId,
        name.trim(),
        description?.trim() || null,
        price,
        imageUrl || null,
        JSON.stringify(dietaryFlags),
        available,
        sortOrder,
        prepTimeMinutes,
      ]
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

// Staff / Admin: Toggle item availability (86-ing an item)
router.patch("/items/:id/availability", requireStaff(["admin", "staff"]), async (req: Request, res: Response): Promise<void> => {
  const itemId = Number(req.params.id);
  const { available } = req.body;

  try {
    const result = await query(
      "UPDATE menu_items SET available = $1 WHERE id = $2 RETURNING id, name, available",
      [Boolean(available), itemId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json({ success: true, item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// Admin: Delete item
router.delete("/items/:id", requireStaff(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const itemId = Number(req.params.id);
  try {
    await query("DELETE FROM menu_items WHERE id = $1", [itemId]);
    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;
