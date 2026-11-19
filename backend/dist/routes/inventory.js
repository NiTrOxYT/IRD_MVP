import { Router } from "express";
import { query, pool } from "../db/index.js";
import { requireStaff } from "../middleware/auth.js";
import { normalizeUnit, areUnitsCompatible, convertUnitQuantity, isValidUnit, SUPPORTED_UNITS, } from "../lib/units.js";
const router = Router();
// ==========================================
// 1. INVENTORY SUMMARY & KPI ALERTS
// ==========================================
router.get("/summary", requireStaff(["admin", "staff"]), async (req, res) => {
    try {
        // 1a. Menu Items Portion Summary
        const itemStockRes = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE track_inventory = true) AS "totalTrackedItems",
          COALESCE(SUM(inventory_quantity) FILTER (WHERE track_inventory = true), 0) AS "totalStockOnHand",
          COUNT(*) FILTER (WHERE track_inventory = true AND inventory_quantity <= 0) AS "outOfStockCount",
          COUNT(*) FILTER (WHERE track_inventory = true AND inventory_quantity > 0 AND inventory_quantity <= low_stock_threshold) AS "lowStockCount"
        FROM menu_items
      `);
        const itemSummary = itemStockRes.rows[0];
        // Stock by unit for menu items
        const itemUnitsRes = await query(`
        SELECT 
          inventory_unit AS unit,
          COALESCE(SUM(inventory_quantity), 0) AS quantity
        FROM menu_items
        WHERE track_inventory = true
        GROUP BY inventory_unit
        ORDER BY unit ASC
      `);
        // 1b. Raw Materials Summary & Value in INR
        const rmStockRes = await query(`
        SELECT 
          COUNT(*) AS "totalRawMaterials",
          COALESCE(SUM(CASE WHEN unit_cost IS NOT NULL AND unit_cost > 0 THEN current_stock * unit_cost ELSE 0 END), 0) AS "totalInventoryValue",
          COUNT(*) FILTER (WHERE current_stock <= 0) AS "outOfStockCount",
          COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= low_stock_threshold) AS "lowStockCount",
          COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date <= (CURRENT_DATE + INTERVAL '7 days')) AS "expiringSoonCount"
        FROM raw_materials
        WHERE is_archived = false
      `);
        const rmSummary = rmStockRes.rows[0];
        // Raw material stock by base unit
        const rmUnitsRes = await query(`
        SELECT 
          base_unit AS unit,
          COALESCE(SUM(current_stock), 0) AS quantity
        FROM raw_materials
        WHERE is_archived = false
        GROUP BY base_unit
        ORDER BY base_unit ASC
      `);
        // 1c. Top Low Stock Alerts
        const lowStockAlerts = await query(`
        (
          SELECT 
            'menu_item' AS item_type,
            id,
            name,
            inventory_quantity AS current_stock,
            inventory_unit AS unit,
            low_stock_threshold,
            CASE WHEN inventory_quantity <= 0 THEN 'out_of_stock' ELSE 'low_stock' END AS alert_status
          FROM menu_items
          WHERE track_inventory = true AND inventory_quantity <= low_stock_threshold
          ORDER BY inventory_quantity ASC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT 
            'raw_material' AS item_type,
            id,
            name,
            current_stock,
            base_unit AS unit,
            low_stock_threshold,
            CASE WHEN current_stock <= 0 THEN 'out_of_stock' ELSE 'low_stock' END AS alert_status
          FROM raw_materials
          WHERE is_archived = false AND current_stock <= low_stock_threshold
          ORDER BY current_stock ASC
          LIMIT 5
        )
      `);
        res.json({
            success: true,
            summary: {
                menuItems: {
                    totalTrackedItems: parseInt(itemSummary.totalTrackedItems || "0", 10),
                    totalStockOnHand: parseFloat(itemSummary.totalStockOnHand || "0"),
                    outOfStockCount: parseInt(itemSummary.outOfStockCount || "0", 10),
                    lowStockCount: parseInt(itemSummary.lowStockCount || "0", 10),
                    byUnit: itemUnitsRes.rows.map((r) => ({
                        unit: r.unit,
                        quantity: parseFloat(r.quantity || "0"),
                    })),
                },
                rawMaterials: {
                    totalItems: parseInt(rmSummary.totalRawMaterials || "0", 10),
                    totalInventoryValue: parseFloat(rmSummary.totalInventoryValue || "0"),
                    outOfStockCount: parseInt(rmSummary.outOfStockCount || "0", 10),
                    lowStockCount: parseInt(rmSummary.lowStockCount || "0", 10),
                    expiringSoonCount: parseInt(rmSummary.expiringSoonCount || "0", 10),
                    byUnit: rmUnitsRes.rows.map((r) => ({
                        unit: r.unit,
                        quantity: parseFloat(r.quantity || "0"),
                    })),
                },
                alerts: lowStockAlerts.rows,
            },
        });
    }
    catch (err) {
        console.error("[Inventory] Summary error:", err);
        res.status(500).json({ error: "Failed to fetch inventory summary" });
    }
});
// ==========================================
// 2. MENU ITEMS PORTION INVENTORY
// ==========================================
router.get("/items", requireStaff(["admin", "staff"]), async (req, res) => {
    try {
        const { categoryId, status, search } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;
        if (categoryId && categoryId !== "all") {
            conditions.push(`m.category_id = $${idx++}`);
            values.push(Number(categoryId));
        }
        if (search && String(search).trim()) {
            conditions.push(`m.name ILIKE $${idx++}`);
            values.push(`%${String(search).trim()}%`);
        }
        if (status === "tracked") {
            conditions.push("m.track_inventory = true");
        }
        else if (status === "untracked") {
            conditions.push("m.track_inventory = false");
        }
        else if (status === "out_of_stock") {
            conditions.push("m.track_inventory = true AND m.inventory_quantity <= 0");
        }
        else if (status === "low_stock") {
            conditions.push("m.track_inventory = true AND m.inventory_quantity > 0 AND m.inventory_quantity <= m.low_stock_threshold");
        }
        else if (status === "in_stock") {
            conditions.push("m.track_inventory = true AND m.inventory_quantity > m.low_stock_threshold");
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const itemsRes = await query(`SELECT 
          m.id,
          m.name,
          m.price,
          m.category_id,
          c.name AS category_name,
          m.track_inventory,
          m.inventory_quantity,
          m.inventory_unit,
          m.low_stock_threshold,
          m.available,
          CASE 
            WHEN NOT m.track_inventory THEN 'untracked'
            WHEN m.inventory_quantity <= 0 THEN 'out_of_stock'
            WHEN m.inventory_quantity <= m.low_stock_threshold THEN 'low_stock'
            ELSE 'in_stock'
          END AS stock_status,
          (
            SELECT COUNT(*) 
            FROM menu_item_recipes mir 
            WHERE mir.menu_item_id = m.id
          ) AS recipe_ingredients_count
        FROM menu_items m
        LEFT JOIN menu_categories c ON m.category_id = c.id
        ${whereClause}
        ORDER BY m.category_id ASC, m.sort_order ASC, m.id ASC`, values);
        res.json({
            success: true,
            items: itemsRes.rows.map((r) => ({
                ...r,
                price: parseFloat(r.price),
                inventory_quantity: parseFloat(r.inventory_quantity || "0"),
                low_stock_threshold: parseFloat(r.low_stock_threshold || "0"),
                recipe_ingredients_count: parseInt(r.recipe_ingredients_count || "0", 10),
            })),
        });
    }
    catch (err) {
        console.error("[Inventory] Get items error:", err);
        res.status(500).json({ error: "Failed to fetch menu items inventory" });
    }
});
// Update inventory settings for a menu item
router.patch("/items/:id/settings", requireStaff(["admin", "staff"]), async (req, res) => {
    const id = Number(req.params.id);
    const { trackInventory, inventoryQuantity, inventoryUnit, lowStockThreshold } = req.body;
    const staff = req.staff;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const prevRes = await client.query("SELECT id, name, track_inventory, inventory_quantity, inventory_unit, low_stock_threshold FROM menu_items WHERE id = $1 FOR UPDATE", [id]);
        if (prevRes.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Menu item not found" });
            return;
        }
        const prev = prevRes.rows[0];
        const targetTrack = typeof trackInventory === "boolean" ? trackInventory : prev.track_inventory;
        const targetQty = typeof inventoryQuantity === "number" ? Math.max(0, inventoryQuantity) : parseFloat(prev.inventory_quantity);
        const targetUnit = inventoryUnit ? normalizeUnit(inventoryUnit) : prev.inventory_unit;
        const targetThreshold = typeof lowStockThreshold === "number" ? Math.max(0, lowStockThreshold) : parseFloat(prev.low_stock_threshold);
        if (!isValidUnit(targetUnit)) {
            await client.query("ROLLBACK");
            res.status(400).json({ error: `Invalid unit "${targetUnit}". Supported: ${SUPPORTED_UNITS.join(", ")}` });
            return;
        }
        const updateRes = await client.query(`UPDATE menu_items 
         SET track_inventory = $1, inventory_quantity = $2, inventory_unit = $3, low_stock_threshold = $4
         WHERE id = $5
         RETURNING *`, [targetTrack, targetQty, targetUnit, targetThreshold, id]);
        // If quantity changed or tracking just enabled, record movement
        const prevQty = parseFloat(prev.inventory_quantity);
        if (targetTrack && (prevQty !== targetQty || !prev.track_inventory)) {
            const isNew = !prev.track_inventory && targetTrack;
            await client.query(`INSERT INTO inventory_movements (
            menu_item_id, movement_type, quantity, balance_after, unit, reason, performed_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [
                id,
                isNew ? "opening_stock" : "adjustment",
                Math.abs(targetQty - prevQty) || targetQty,
                targetQty,
                targetUnit,
                isNew ? "Opening stock configured" : "Inventory settings updated",
                staff.username,
            ]);
        }
        await client.query("COMMIT");
        res.json({ success: true, item: updateRes.rows[0] });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("[Inventory] Update item settings error:", err);
        res.status(500).json({ error: "Failed to update item inventory settings" });
    }
    finally {
        client.release();
    }
});
// Manual stock adjustment for a menu item portion
router.post("/items/adjust", requireStaff(["admin", "staff"]), async (req, res) => {
    const { menuItemId, movementType, quantity, reason } = req.body;
    const staff = req.staff;
    if (!menuItemId || !movementType || quantity === undefined) {
        res.status(400).json({ error: "Missing required fields: menuItemId, movementType, quantity" });
        return;
    }
    const validTypes = ["stock_in", "stock_out", "adjustment", "wastage"];
    if (!validTypes.includes(movementType)) {
        res.status(400).json({ error: `movementType must be one of: ${validTypes.join(", ")}` });
        return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ error: "Quantity must be a positive number" });
        return;
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const itemRes = await client.query("SELECT id, name, inventory_quantity, inventory_unit, track_inventory FROM menu_items WHERE id = $1 FOR UPDATE", [menuItemId]);
        if (itemRes.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Menu item not found" });
            return;
        }
        const item = itemRes.rows[0];
        const current = parseFloat(item.inventory_quantity || "0");
        let newBalance = current;
        if (movementType === "stock_in") {
            newBalance = Math.round((current + qty) * 100) / 100;
        }
        else if (movementType === "stock_out" || movementType === "wastage") {
            if (current < qty) {
                await client.query("ROLLBACK");
                res.status(400).json({
                    error: `Cannot deduct ${qty} ${item.inventory_unit}. Only ${current} ${item.inventory_unit} available in stock.`,
                });
                return;
            }
            newBalance = Math.round((current - qty) * 100) / 100;
        }
        else if (movementType === "adjustment") {
            newBalance = Math.round(qty * 100) / 100;
        }
        await client.query("UPDATE menu_items SET inventory_quantity = $1, track_inventory = TRUE WHERE id = $2", [newBalance, menuItemId]);
        const movRes = await client.query(`INSERT INTO inventory_movements (
          menu_item_id, movement_type, quantity, balance_after, unit, reason, performed_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *`, [
            menuItemId,
            movementType,
            qty,
            newBalance,
            item.inventory_unit,
            reason?.trim() || `Manual ${movementType.replace("_", " ")}`,
            staff.username,
        ]);
        await client.query("COMMIT");
        res.json({ success: true, movement: movRes.rows[0], newBalance });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("[Inventory] Adjust item error:", err);
        res.status(500).json({ error: "Failed to adjust inventory" });
    }
    finally {
        client.release();
    }
});
// Menu item portion movements audit history
router.get("/movements", requireStaff(["admin", "staff"]), async (req, res) => {
    try {
        const { menuItemId, movementType, limit = 50, offset = 0 } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;
        if (menuItemId) {
            conditions.push(`im.menu_item_id = $${idx++}`);
            values.push(Number(menuItemId));
        }
        if (movementType && movementType !== "all") {
            conditions.push(`im.movement_type = $${idx++}`);
            values.push(String(movementType));
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const countRes = await query(`SELECT COUNT(*) AS total FROM inventory_movements im ${whereClause}`, values);
        const total = parseInt(countRes.rows[0]?.total || "0", 10);
        const movementsRes = await query(`SELECT 
          im.*,
          m.name AS menu_item_name,
          c.name AS category_name
        FROM inventory_movements im
        JOIN menu_items m ON im.menu_item_id = m.id
        LEFT JOIN menu_categories c ON m.category_id = c.id
        ${whereClause}
        ORDER BY im.created_at DESC, im.id DESC
        LIMIT $${idx++} OFFSET $${idx++}`, [...values, Number(limit), Number(offset)]);
        res.json({
            success: true,
            total,
            movements: movementsRes.rows,
        });
    }
    catch (err) {
        console.error("[Inventory] Get movements error:", err);
        res.status(500).json({ error: "Failed to fetch movements history" });
    }
});
// ==========================================
// 3. RAW MATERIALS & INGREDIENTS
// ==========================================
router.get("/raw-materials", requireStaff(["admin", "staff"]), async (req, res) => {
    try {
        const { category, supplier, status, search } = req.query;
        const conditions = ["r.is_archived = false"];
        const values = [];
        let idx = 1;
        if (category && category !== "all") {
            conditions.push(`LOWER(r.category) = LOWER($${idx++})`);
            values.push(String(category).trim());
        }
        if (supplier && supplier !== "all") {
            conditions.push(`LOWER(r.supplier) = LOWER($${idx++})`);
            values.push(String(supplier).trim());
        }
        if (search && String(search).trim()) {
            conditions.push(`(r.name ILIKE $${idx} OR r.sku ILIKE $${idx})`);
            values.push(`%${String(search).trim()}%`);
            idx++;
        }
        if (status === "out_of_stock") {
            conditions.push("r.current_stock <= 0");
        }
        else if (status === "low_stock") {
            conditions.push("r.current_stock > 0 AND r.current_stock <= r.low_stock_threshold");
        }
        else if (status === "in_stock") {
            conditions.push("r.current_stock > r.low_stock_threshold");
        }
        const whereClause = `WHERE ${conditions.join(" AND ")}`;
        const listRes = await query(`SELECT 
          r.*,
          CASE 
            WHEN r.current_stock <= 0 THEN 'out_of_stock'
            WHEN r.current_stock <= r.low_stock_threshold THEN 'low_stock'
            ELSE 'in_stock'
          END AS stock_status,
          CASE 
            WHEN r.unit_cost IS NOT NULL AND r.unit_cost > 0 THEN r.current_stock * r.unit_cost 
            ELSE 0 
          END AS total_value,
          (
            SELECT COUNT(*) 
            FROM menu_item_recipes mir 
            WHERE mir.raw_material_id = r.id
          ) AS used_in_recipes_count
        FROM raw_materials r
        ${whereClause}
        ORDER BY r.category ASC, r.name ASC`, values);
        // Categories and Suppliers for filter dropdowns
        const catsRes = await query("SELECT DISTINCT category FROM raw_materials WHERE is_archived = false ORDER BY category ASC");
        const suppsRes = await query("SELECT DISTINCT supplier FROM raw_materials WHERE is_archived = false AND supplier IS NOT NULL AND supplier != '' ORDER BY supplier ASC");
        res.json({
            success: true,
            rawMaterials: listRes.rows.map((r) => ({
                ...r,
                current_stock: parseFloat(r.current_stock || "0"),
                low_stock_threshold: parseFloat(r.low_stock_threshold || "0"),
                unit_cost: r.unit_cost ? parseFloat(r.unit_cost) : null,
                total_value: parseFloat(r.total_value || "0"),
                used_in_recipes_count: parseInt(r.used_in_recipes_count || "0", 10),
            })),
            categories: catsRes.rows.map((c) => c.category),
            suppliers: suppsRes.rows.map((s) => s.supplier),
        });
    }
    catch (err) {
        console.error("[Inventory] Get raw materials error:", err);
        res.status(500).json({ error: "Failed to fetch raw materials" });
    }
});
// Create new raw material
router.post("/raw-materials", requireStaff(["admin", "staff"]), async (req, res) => {
    const { name, category = "Ingredients", sku, baseUnit = "kg", currentStock = 0, lowStockThreshold = 2, supplier, unitCost, batchNumber, expiryDate, } = req.body;
    const staff = req.staff;
    if (!name || !String(name).trim()) {
        res.status(400).json({ error: "Raw material name is required" });
        return;
    }
    const normUnit = normalizeUnit(baseUnit);
    if (!isValidUnit(normUnit)) {
        res.status(400).json({ error: `Invalid unit "${baseUnit}". Supported: ${SUPPORTED_UNITS.join(", ")}` });
        return;
    }
    const stock = Math.max(0, parseFloat(currentStock) || 0);
    const threshold = Math.max(0, parseFloat(lowStockThreshold) || 2);
    const cost = unitCost ? Math.max(0, parseFloat(unitCost)) : null;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const insertRes = await client.query(`INSERT INTO raw_materials (
          property_id, name, category, sku, base_unit, current_stock,
          low_stock_threshold, supplier, unit_cost, batch_number, expiry_date
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`, [
            String(name).trim(),
            String(category).trim() || "Ingredients",
            sku?.trim() || null,
            normUnit,
            stock,
            threshold,
            supplier?.trim() || null,
            cost,
            batchNumber?.trim() || null,
            expiryDate || null,
        ]);
        const created = insertRes.rows[0];
        if (stock > 0) {
            await client.query(`INSERT INTO raw_material_movements (
            raw_material_id, movement_type, quantity, unit, base_quantity,
            balance_before, balance_after, unit_cost, total_cost, supplier,
            batch_number, expiry_date, reason, performed_by, created_at
          ) VALUES ($1, 'opening_stock', $2, $3, $4, 0, $5, $6, $7, $8, $9, $10, 'Initial opening stock', $11, NOW())`, [
                created.id,
                stock,
                normUnit,
                stock,
                stock,
                cost,
                cost ? stock * cost : null,
                supplier?.trim() || null,
                batchNumber?.trim() || null,
                expiryDate || null,
                staff.username,
            ]);
        }
        await client.query("COMMIT");
        res.status(201).json({ success: true, rawMaterial: created });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("[Inventory] Create raw material error:", err);
        res.status(500).json({ error: "Failed to create raw material" });
    }
    finally {
        client.release();
    }
});
// Update raw material details
router.put("/raw-materials/:id", requireStaff(["admin", "staff"]), async (req, res) => {
    const id = Number(req.params.id);
    const { name, category, sku, lowStockThreshold, supplier, unitCost, batchNumber, expiryDate, isArchived, } = req.body;
    try {
        const updateRes = await query(`UPDATE raw_materials 
         SET name = COALESCE($1, name),
             category = COALESCE($2, category),
             sku = COALESCE($3, sku),
             low_stock_threshold = COALESCE($4, low_stock_threshold),
             supplier = COALESCE($5, supplier),
             unit_cost = COALESCE($6, unit_cost),
             batch_number = COALESCE($7, batch_number),
             expiry_date = COALESCE($8, expiry_date),
             is_archived = COALESCE($9, is_archived),
             updated_at = NOW()
         WHERE id = $10
         RETURNING *`, [
            name?.trim(),
            category?.trim(),
            sku?.trim(),
            lowStockThreshold !== undefined ? Math.max(0, parseFloat(lowStockThreshold)) : null,
            supplier?.trim(),
            unitCost !== undefined ? Math.max(0, parseFloat(unitCost)) : null,
            batchNumber?.trim(),
            expiryDate || null,
            typeof isArchived === "boolean" ? isArchived : null,
            id,
        ]);
        if (updateRes.rows.length === 0) {
            res.status(404).json({ error: "Raw material not found" });
            return;
        }
        res.json({ success: true, rawMaterial: updateRes.rows[0] });
    }
    catch (err) {
        console.error("[Inventory] Update raw material error:", err);
        res.status(500).json({ error: "Failed to update raw material" });
    }
});
// Adjust raw material stock (Stock In, Stock Out, Wastage, Adjustment)
router.post("/raw-materials/:id/adjust", requireStaff(["admin", "staff"]), async (req, res) => {
    const id = Number(req.params.id);
    const { movementType, quantity, unit, reason, supplier, invoiceRef, unitCost, batchNumber, expiryDate, } = req.body;
    const staff = req.staff;
    const validTypes = ["stock_in", "stock_out", "adjustment", "wastage"];
    if (!movementType || !validTypes.includes(movementType)) {
        res.status(400).json({ error: `movementType must be one of: ${validTypes.join(", ")}` });
        return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ error: "Quantity must be a positive number" });
        return;
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const rmRes = await client.query("SELECT id, name, base_unit, current_stock, unit_cost FROM raw_materials WHERE id = $1 FOR UPDATE", [id]);
        if (rmRes.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Raw material not found" });
            return;
        }
        const rm = rmRes.rows[0];
        const inputUnit = unit ? normalizeUnit(unit) : rm.base_unit;
        if (!areUnitsCompatible(inputUnit, rm.base_unit)) {
            await client.query("ROLLBACK");
            res.status(400).json({
                error: `Incompatible unit "${inputUnit}". Raw material "${rm.name}" uses "${rm.base_unit}".`,
            });
            return;
        }
        const baseQuantity = convertUnitQuantity(qty, inputUnit, rm.base_unit);
        const currentStock = parseFloat(rm.current_stock || "0");
        let newBalance = currentStock;
        if (movementType === "stock_in") {
            newBalance = Math.round((currentStock + baseQuantity) * 1000) / 1000;
        }
        else if (movementType === "stock_out" || movementType === "wastage") {
            if (currentStock < baseQuantity) {
                await client.query("ROLLBACK");
                res.status(400).json({
                    error: `Cannot deduct ${baseQuantity} ${rm.base_unit}. Only ${currentStock} ${rm.base_unit} available in stock.`,
                });
                return;
            }
            newBalance = Math.round((currentStock - baseQuantity) * 1000) / 1000;
        }
        else if (movementType === "adjustment") {
            newBalance = Math.round(baseQuantity * 1000) / 1000;
        }
        const effectiveCost = unitCost ? parseFloat(unitCost) : rm.unit_cost ? parseFloat(rm.unit_cost) : null;
        const totalCost = effectiveCost ? Math.round(baseQuantity * effectiveCost * 100) / 100 : null;
        await client.query(`UPDATE raw_materials 
         SET current_stock = $1,
             unit_cost = COALESCE($2, unit_cost),
             batch_number = COALESCE($3, batch_number),
             expiry_date = COALESCE($4, expiry_date),
             updated_at = NOW()
         WHERE id = $5`, [newBalance, effectiveCost, batchNumber?.trim() || null, expiryDate || null, id]);
        const movRes = await client.query(`INSERT INTO raw_material_movements (
          raw_material_id, movement_type, quantity, unit, base_quantity,
          balance_before, balance_after, unit_cost, total_cost, supplier,
          invoice_ref, batch_number, expiry_date, reason, performed_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        RETURNING *`, [
            id,
            movementType,
            qty,
            inputUnit,
            baseQuantity,
            currentStock,
            newBalance,
            effectiveCost,
            totalCost,
            supplier?.trim() || null,
            invoiceRef?.trim() || null,
            batchNumber?.trim() || null,
            expiryDate || null,
            reason?.trim() || `Manual ${movementType.replace("_", " ")}`,
            staff.username,
        ]);
        await client.query("COMMIT");
        res.json({
            success: true,
            movement: movRes.rows[0],
            newBalance,
            baseUnit: rm.base_unit,
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("[Inventory] Adjust raw material error:", err);
        res.status(500).json({ error: "Failed to adjust raw material stock" });
    }
    finally {
        client.release();
    }
});
// Raw material movement audit history
router.get("/raw-materials/movements", requireStaff(["admin", "staff"]), async (req, res) => {
    try {
        const { rawMaterialId, movementType, limit = 50, offset = 0 } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;
        if (rawMaterialId) {
            conditions.push(`rmm.raw_material_id = $${idx++}`);
            values.push(Number(rawMaterialId));
        }
        if (movementType && movementType !== "all") {
            conditions.push(`rmm.movement_type = $${idx++}`);
            values.push(String(movementType));
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const countRes = await query(`SELECT COUNT(*) AS total FROM raw_material_movements rmm ${whereClause}`, values);
        const total = parseInt(countRes.rows[0]?.total || "0", 10);
        const movementsRes = await query(`SELECT 
          rmm.*,
          r.name AS raw_material_name,
          r.category AS raw_material_category
        FROM raw_material_movements rmm
        JOIN raw_materials r ON rmm.raw_material_id = r.id
        ${whereClause}
        ORDER BY rmm.created_at DESC, rmm.id DESC
        LIMIT $${idx++} OFFSET $${idx++}`, [...values, Number(limit), Number(offset)]);
        res.json({
            success: true,
            total,
            movements: movementsRes.rows,
        });
    }
    catch (err) {
        console.error("[Inventory] Get raw material movements error:", err);
        res.status(500).json({ error: "Failed to fetch raw material movements" });
    }
});
// ==========================================
// 4. DISH RECIPES (BILL OF MATERIALS)
// ==========================================
// List all dish recipes grouped by menu item
router.get("/recipes", requireStaff(["admin", "staff"]), async (_req, res) => {
    try {
        const recipesRes = await query(`
        SELECT 
          m.id AS menu_item_id,
          m.name AS menu_item_name,
          m.price AS menu_item_price,
          c.name AS category_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id', mir.id,
                'rawMaterialId', mir.raw_material_id,
                'rawMaterialName', r.name,
                'quantity', mir.quantity,
                'unit', mir.unit,
                'notes', mir.notes,
                'unitCost', r.unit_cost,
                'baseUnit', r.base_unit,
                'currentStock', r.current_stock
              ) ORDER BY r.name ASC
            ) FILTER (WHERE mir.id IS NOT NULL),
            '[]'::json
          ) AS ingredients
        FROM menu_items m
        LEFT JOIN menu_categories c ON m.category_id = c.id
        LEFT JOIN menu_item_recipes mir ON m.id = mir.menu_item_id
        LEFT JOIN raw_materials r ON mir.raw_material_id = r.id AND r.is_archived = false
        GROUP BY m.id, m.name, m.price, c.name, m.sort_order
        ORDER BY c.name ASC, m.sort_order ASC, m.name ASC
      `);
        res.json({
            success: true,
            recipes: recipesRes.rows.map((r) => ({
                ...r,
                menu_item_price: parseFloat(r.menu_item_price),
            })),
        });
    }
    catch (err) {
        console.error("[Inventory] Get recipes error:", err);
        res.status(500).json({ error: "Failed to fetch recipes" });
    }
});
// Get recipe for a specific menu item
router.get("/recipes/:menuItemId", requireStaff(["admin", "staff"]), async (req, res) => {
    const menuItemId = Number(req.params.menuItemId);
    try {
        const itemRes = await query("SELECT id, name, price FROM menu_items WHERE id = $1", [menuItemId]);
        if (itemRes.rows.length === 0) {
            res.status(404).json({ error: "Menu item not found" });
            return;
        }
        const ingRes = await query(`SELECT 
          mir.id,
          mir.raw_material_id AS "rawMaterialId",
          r.name AS "rawMaterialName",
          mir.quantity,
          mir.unit,
          mir.notes,
          r.unit_cost AS "unitCost",
          r.base_unit AS "baseUnit",
          r.current_stock AS "currentStock"
        FROM menu_item_recipes mir
        JOIN raw_materials r ON mir.raw_material_id = r.id
        WHERE mir.menu_item_id = $1 AND r.is_archived = false
        ORDER BY r.name ASC`, [menuItemId]);
        res.json({
            success: true,
            menuItem: itemRes.rows[0],
            ingredients: ingRes.rows.map((row) => ({
                ...row,
                quantity: parseFloat(row.quantity),
                unitCost: row.unitCost ? parseFloat(row.unitCost) : null,
                currentStock: parseFloat(row.currentStock || "0"),
            })),
        });
    }
    catch (err) {
        console.error("[Inventory] Get item recipe error:", err);
        res.status(500).json({ error: "Failed to fetch item recipe" });
    }
});
// Configure / replace recipe ingredients for a menu item
router.put("/recipes/:menuItemId", requireStaff(["admin", "staff"]), async (req, res) => {
    const menuItemId = Number(req.params.menuItemId);
    const { ingredients } = req.body; // Array of { rawMaterialId, quantity, unit, notes }
    if (!Array.isArray(ingredients)) {
        res.status(400).json({ error: "ingredients must be an array" });
        return;
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const itemRes = await client.query("SELECT id, name FROM menu_items WHERE id = $1", [menuItemId]);
        if (itemRes.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Menu item not found" });
            return;
        }
        // Validate all ingredients first
        for (const ing of ingredients) {
            const rmRes = await client.query("SELECT id, name, base_unit FROM raw_materials WHERE id = $1 AND is_archived = false", [ing.rawMaterialId]);
            if (rmRes.rows.length === 0) {
                await client.query("ROLLBACK");
                res.status(400).json({ error: `Raw material ID ${ing.rawMaterialId} not found` });
                return;
            }
            const rm = rmRes.rows[0];
            const ingUnit = ing.unit ? normalizeUnit(ing.unit) : rm.base_unit;
            if (!areUnitsCompatible(ingUnit, rm.base_unit)) {
                await client.query("ROLLBACK");
                res.status(400).json({
                    error: `Incompatible unit "${ing.unit}" for "${rm.name}". Raw material base unit is "${rm.base_unit}".`,
                });
                return;
            }
            const qty = parseFloat(ing.quantity);
            if (isNaN(qty) || qty <= 0) {
                await client.query("ROLLBACK");
                res.status(400).json({ error: `Invalid quantity for ingredient "${rm.name}"` });
                return;
            }
        }
        // Delete existing recipe ingredients
        await client.query("DELETE FROM menu_item_recipes WHERE menu_item_id = $1", [menuItemId]);
        // Insert new recipe ingredients
        for (const ing of ingredients) {
            const normUnit = normalizeUnit(ing.unit);
            await client.query(`INSERT INTO menu_item_recipes (
            property_id, menu_item_id, raw_material_id, quantity, unit, notes
          ) VALUES (1, $1, $2, $3, $4, $5)`, [
                menuItemId,
                ing.rawMaterialId,
                parseFloat(ing.quantity),
                normUnit,
                ing.notes?.trim() || null,
            ]);
        }
        await client.query("COMMIT");
        res.json({ success: true, message: "Recipe updated successfully" });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("[Inventory] Save recipe error:", err);
        res.status(500).json({ error: "Failed to save recipe" });
    }
    finally {
        client.release();
    }
});
export default router;
