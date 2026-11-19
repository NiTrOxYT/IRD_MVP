import { Router } from "express";
import { query, pool } from "../db/index.js";
import { categorySchema, menuItemSchema, reorderCategoriesSchema } from "../lib/validation.js";
import { requireStaff } from "../middleware/auth.js";
const router = Router();
// Guest & public menu
router.get("/", async (_req, res) => {
    try {
        const catRes = await query("SELECT id, name, description, sort_order FROM menu_categories WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC");
        const itemsRes = await query(`
      SELECT m.id, m.category_id, m.name, m.description, m.price, m.image_url,
             m.dietary_flags, m.available, m.sort_order, m.prep_time_minutes
      FROM menu_items m
      JOIN menu_categories c ON m.category_id = c.id
      WHERE m.available = TRUE AND c.is_active = TRUE
      ORDER BY m.sort_order ASC, m.id ASC
    `);
        // Fetch active variants
        const varRes = await query("SELECT id, menu_item_id, name, price, available, sort_order FROM menu_item_variants WHERE available = TRUE ORDER BY sort_order ASC, id ASC");
        const variantsByItem = {};
        for (const v of varRes.rows) {
            if (!variantsByItem[v.menu_item_id])
                variantsByItem[v.menu_item_id] = [];
            variantsByItem[v.menu_item_id].push({
                id: v.id,
                menuItemId: v.menu_item_id,
                name: v.name,
                price: Number(v.price),
                available: v.available,
                sortOrder: v.sort_order,
            });
        }
        // Fetch modifiers
        const modRes = await query("SELECT id, menu_item_id, group_name, name, price_delta, is_default FROM item_modifiers ORDER BY id ASC");
        const modifiersByItem = {};
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
            variants: variantsByItem[row.id] || [],
            modifiers: modifiersByItem[row.id] || [],
        }));
        res.json({
            categories: catRes.rows,
            items,
        });
    }
    catch (err) {
        console.error("[Menu] fetch error:", err);
        res.status(500).json({ error: "Failed to load menu" });
    }
});
// Staff / Admin: View full menu with all categories, item counts, and inactive items
router.get("/admin", requireStaff("menu:view"), async (_req, res) => {
    try {
        const catRes = await query(`
      SELECT c.id, c.property_id, c.name, c.description, c.sort_order, c.is_active,
             COUNT(m.id)::int as item_count
      FROM menu_categories c
      LEFT JOIN menu_items m ON c.id = m.category_id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.id ASC
    `);
        const itemsRes = await query("SELECT * FROM menu_items ORDER BY category_id ASC, sort_order ASC, id ASC");
        // Fetch all variants (including unavailable ones for admin display)
        const varRes = await query("SELECT id, menu_item_id, name, price, available, sort_order FROM menu_item_variants ORDER BY sort_order ASC, id ASC");
        const variantsByItem = {};
        for (const v of varRes.rows) {
            if (!variantsByItem[v.menu_item_id])
                variantsByItem[v.menu_item_id] = [];
            variantsByItem[v.menu_item_id].push({
                id: v.id,
                menuItemId: v.menu_item_id,
                name: v.name,
                price: Number(v.price),
                available: v.available,
                sortOrder: v.sort_order,
            });
        }
        const modRes = await query("SELECT * FROM item_modifiers ORDER BY id ASC");
        const modifiersByItem = {};
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
            variants: variantsByItem[row.id] || [],
            modifiers: modifiersByItem[row.id] || [],
        }));
        res.json({ categories: catRes.rows, items });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch admin menu" });
    }
});
// Admin: Create Category
router.get("/categories", requireStaff("menu:view"), async (_req, res) => {
    try {
        const result = await query(`
      SELECT c.id, c.property_id, c.name, c.description, c.sort_order, c.is_active,
             COUNT(m.id)::int AS item_count
      FROM menu_categories c
      LEFT JOIN menu_items m ON m.category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.id ASC
    `);
        res.json({ categories: result.rows });
    }
    catch (err) {
        console.error("[Menu] Fetch categories error:", err);
        res.status(500).json({ error: "Failed to fetch menu categories" });
    }
});
router.post("/categories", requireStaff("menu:create"), async (req, res) => {
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0].message });
        return;
    }
    const { name, description, sortOrder, isActive } = parse.data;
    const staff = req.staff;
    try {
        const result = await query("INSERT INTO menu_categories (property_id, name, description, sort_order, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *", [staff.propertyId, name.trim(), description?.trim() || null, sortOrder, isActive]);
        res.status(201).json({ category: { ...result.rows[0], item_count: 0 } });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to create category" });
    }
});
// Admin: Update Category
router.put("/categories/:id", requireStaff("menu:edit"), async (req, res) => {
    const catId = Number(req.params.id);
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0].message });
        return;
    }
    const { name, description, sortOrder, isActive } = parse.data;
    try {
        const result = await query(`UPDATE menu_categories
       SET name = $1, description = $2, sort_order = $3, is_active = $4
       WHERE id = $5
       RETURNING *`, [name.trim(), description?.trim() || null, sortOrder, isActive, catId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Category not found" });
            return;
        }
        const countRes = await query("SELECT COUNT(*)::int as count FROM menu_items WHERE category_id = $1", [catId]);
        res.json({ category: { ...result.rows[0], item_count: countRes.rows[0]?.count || 0 } });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update category" });
    }
});
// Admin: Toggle Category Active Status
router.patch("/categories/:id/status", requireStaff("menu:edit"), async (req, res) => {
    const catId = Number(req.params.id);
    const { isActive } = req.body;
    try {
        const result = await query("UPDATE menu_categories SET is_active = $1 WHERE id = $2 RETURNING *", [Boolean(isActive), catId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Category not found" });
            return;
        }
        res.json({ success: true, category: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update category status" });
    }
});
// Admin: Reorder Categories
router.patch("/categories/reorder", requireStaff("menu:edit"), async (req, res) => {
    const parse = reorderCategoriesSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0].message });
        return;
    }
    const client = await pool.connect();
    try {
        const reorderList = parse.data.items || parse.data.orders || [];
        await client.query("BEGIN");
        for (const item of reorderList) {
            await client.query("UPDATE menu_categories SET sort_order = $1 WHERE id = $2", [item.sortOrder, item.id]);
        }
        await client.query("COMMIT");
        res.json({ success: true, message: "Categories reordered successfully" });
    }
    catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Failed to reorder categories" });
    }
    finally {
        client.release();
    }
});
// Admin: Delete Category (with items safeguard & reassignment)
router.delete("/categories/:id", requireStaff("menu:delete"), async (req, res) => {
    const catId = Number(req.params.id);
    const reassignToId = req.body?.reassignToId || req.query.reassignToId ? Number(req.body?.reassignToId || req.query.reassignToId) : null;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Check items count in this category
        const countRes = await client.query("SELECT COUNT(*)::int as count FROM menu_items WHERE category_id = $1", [catId]);
        const itemCount = countRes.rows[0]?.count || 0;
        if (itemCount > 0) {
            if (!reassignToId) {
                await client.query("ROLLBACK");
                res.status(400).json({
                    error: `Category contains ${itemCount} menu item(s). Reassign them to another category first.`,
                    itemCount,
                });
                return;
            }
            if (reassignToId === catId) {
                await client.query("ROLLBACK");
                res.status(400).json({ error: "Cannot reassign items to the same category being deleted." });
                return;
            }
            // Verify target category exists
            const targetCat = await client.query("SELECT id FROM menu_categories WHERE id = $1", [reassignToId]);
            if (targetCat.rows.length === 0) {
                await client.query("ROLLBACK");
                res.status(400).json({ error: "Target reassignment category does not exist." });
                return;
            }
            // Reassign items
            await client.query("UPDATE menu_items SET category_id = $1 WHERE category_id = $2", [reassignToId, catId]);
        }
        const delRes = await client.query("DELETE FROM menu_categories WHERE id = $1 RETURNING id", [catId]);
        if (delRes.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Category not found" });
            return;
        }
        await client.query("COMMIT");
        res.json({ success: true, message: "Category deleted", reassignedCount: itemCount });
    }
    catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Failed to delete category" });
    }
    finally {
        client.release();
    }
});
// Admin: Create Item (with optional variants)
router.post("/items", requireStaff("menu:create"), async (req, res) => {
    const parse = menuItemSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0].message });
        return;
    }
    const { categoryId, name, description, price, imageUrl, dietaryFlags, available, sortOrder, prepTimeMinutes, variants } = parse.data;
    const staff = req.staff;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(`INSERT INTO menu_items (property_id, category_id, name, description, price, image_url, dietary_flags, available, sort_order, prep_time_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [
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
        ]);
        const createdItem = result.rows[0];
        const createdVariants = [];
        if (variants && variants.length > 0) {
            for (const v of variants) {
                const vRes = await client.query(`INSERT INTO menu_item_variants (menu_item_id, name, price, available, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`, [createdItem.id, v.name.trim(), v.price, v.available, v.sortOrder]);
                createdVariants.push({
                    id: vRes.rows[0].id,
                    menuItemId: createdItem.id,
                    name: vRes.rows[0].name,
                    price: Number(vRes.rows[0].price),
                    available: vRes.rows[0].available,
                    sortOrder: vRes.rows[0].sort_order,
                });
            }
        }
        await client.query("COMMIT");
        res.status(201).json({
            item: {
                ...createdItem,
                price: Number(createdItem.price),
                dietaryFlags: createdItem.dietary_flags || [],
                variants: createdVariants,
            },
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Failed to create menu item" });
    }
    finally {
        client.release();
    }
});
// Admin: Update Item (with variants)
router.put("/items/:id", requireStaff("menu:edit"), async (req, res) => {
    const itemId = Number(req.params.id);
    const parse = menuItemSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0].message });
        return;
    }
    const { categoryId, name, description, price, imageUrl, dietaryFlags, available, sortOrder, prepTimeMinutes, variants } = parse.data;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(`UPDATE menu_items
       SET category_id = $1, name = $2, description = $3, price = $4,
           image_url = $5, dietary_flags = $6, available = $7, sort_order = $8,
           prep_time_minutes = $9
       WHERE id = $10
       RETURNING *`, [
            categoryId,
            name.trim(),
            description?.trim() || null,
            price,
            imageUrl || null,
            JSON.stringify(dietaryFlags),
            available,
            sortOrder,
            prepTimeMinutes,
            itemId,
        ]);
        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Item not found" });
            return;
        }
        // Sync variants: remove existing and re-insert updated list
        await client.query("DELETE FROM menu_item_variants WHERE menu_item_id = $1", [itemId]);
        const updatedVariants = [];
        if (variants && variants.length > 0) {
            for (const v of variants) {
                const vRes = await client.query(`INSERT INTO menu_item_variants (menu_item_id, name, price, available, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`, [itemId, v.name.trim(), v.price, v.available, v.sortOrder]);
                updatedVariants.push({
                    id: vRes.rows[0].id,
                    menuItemId: itemId,
                    name: vRes.rows[0].name,
                    price: Number(vRes.rows[0].price),
                    available: vRes.rows[0].available,
                    sortOrder: vRes.rows[0].sort_order,
                });
            }
        }
        await client.query("COMMIT");
        const updatedItem = result.rows[0];
        res.json({
            success: true,
            item: {
                ...updatedItem,
                price: Number(updatedItem.price),
                dietaryFlags: updatedItem.dietary_flags || [],
                variants: updatedVariants,
            },
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Failed to update menu item" });
    }
    finally {
        client.release();
    }
});
// Staff / Admin: Toggle item availability (86-ing an item)
router.patch("/items/:id/availability", requireStaff("menu:edit"), async (req, res) => {
    const itemId = Number(req.params.id);
    const { available } = req.body;
    try {
        const result = await query("UPDATE menu_items SET available = $1 WHERE id = $2 RETURNING id, name, available", [Boolean(available), itemId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Item not found" });
            return;
        }
        res.json({ success: true, item: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update availability" });
    }
});
// Admin: Delete item
router.delete("/items/:id", requireStaff("menu:delete"), async (req, res) => {
    const itemId = Number(req.params.id);
    try {
        await query("DELETE FROM menu_items WHERE id = $1", [itemId]);
        res.json({ success: true, message: "Item deleted" });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to delete item" });
    }
});
export default router;
