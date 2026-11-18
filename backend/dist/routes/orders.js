import { Router } from "express";
import { query, pool } from "../db/index.js";
import { requireActiveStay } from "../middleware/stayAuth.js";
import { requireStaff } from "../middleware/auth.js";
import { createOrderSchema, updateOrderStatusSchema } from "../lib/validation.js";
import { generateOrderNumber, generateGuestOrderToken } from "../lib/tokens.js";
import { broadcastOrderCreated, broadcastOrderStatusChanged } from "../socket.js";
const router = Router();
// Guest: Place order (strictly requires active stay context)
router.post("/", requireActiveStay, async (req, res) => {
    const parse = createOrderSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0].message });
        return;
    }
    const { items, specialInstructions } = parse.data;
    const stay = req.stay;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // 1. Get property settings for taxes and IRD status
        const propRes = await client.query("SELECT tax_rate_percent, service_charge_percent, ird_enabled, opening_time, closing_time FROM properties WHERE id = $1", [stay.propertyId]);
        if (propRes.rows.length === 0 || !propRes.rows[0].ird_enabled) {
            await client.query("ROLLBACK");
            res.status(403).json({ error: "In-Room Dining is currently offline or closed." });
            return;
        }
        const prop = propRes.rows[0];
        const taxRate = Number(prop.tax_rate_percent) / 100;
        const serviceRate = Number(prop.service_charge_percent) / 100;
        // 2. Fetch and validate each menu item and modifier from DB (never trust client prices!)
        let calculatedSubtotal = 0;
        const validatedOrderItems = [];
        for (const item of items) {
            const itemRes = await client.query("SELECT id, name, price, available FROM menu_items WHERE id = $1 AND property_id = $2", [item.menuItemId, stay.propertyId]);
            if (itemRes.rows.length === 0) {
                await client.query("ROLLBACK");
                res.status(400).json({ error: `Menu item with ID ${item.menuItemId} does not exist.` });
                return;
            }
            const dbItem = itemRes.rows[0];
            if (!dbItem.available) {
                await client.query("ROLLBACK");
                res.status(400).json({ error: `"${dbItem.name}" is currently unavailable.` });
                return;
            }
            let itemUnitPrice = Number(dbItem.price);
            const selectedMods = [];
            if (item.modifierIds && item.modifierIds.length > 0) {
                const modRes = await client.query("SELECT id, group_name, name, price_delta FROM item_modifiers WHERE id = ANY($1::int[]) AND menu_item_id = $2", [item.modifierIds, item.menuItemId]);
                for (const mod of modRes.rows) {
                    const delta = Number(mod.price_delta);
                    itemUnitPrice += delta;
                    selectedMods.push({
                        id: mod.id,
                        groupName: mod.group_name,
                        name: mod.name,
                        priceDelta: delta,
                    });
                }
            }
            const lineTotal = itemUnitPrice * item.quantity;
            calculatedSubtotal += lineTotal;
            validatedOrderItems.push({
                menuItemId: dbItem.id,
                itemName: dbItem.name,
                unitPrice: itemUnitPrice,
                quantity: item.quantity,
                selectedModifiers: selectedMods,
                lineTotal,
                notes: item.notes,
            });
        }
        const taxAmount = Math.round(calculatedSubtotal * taxRate * 100) / 100;
        const serviceCharge = Math.round(calculatedSubtotal * serviceRate * 100) / 100;
        const totalAmount = Math.round((calculatedSubtotal + taxAmount + serviceCharge) * 100) / 100;
        const orderNumber = generateOrderNumber(stay.roomNumber);
        // Initial dummy token to create order row
        const initialToken = "pending_token";
        const orderInsertRes = await client.query(`INSERT INTO orders (
        property_id, stay_id, room_id, order_number, guest_name, room_number,
        status, special_instructions, subtotal, tax_amount, service_charge,
        total_amount, guest_order_token
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11, $12)
      RETURNING *`, [
            stay.propertyId,
            stay.id,
            stay.roomId,
            orderNumber,
            stay.guestName,
            stay.roomNumber,
            specialInstructions?.trim() || null,
            calculatedSubtotal,
            taxAmount,
            serviceCharge,
            totalAmount,
            initialToken,
        ]);
        const createdOrder = orderInsertRes.rows[0];
        // Real guest order token signed with order details
        const guestOrderToken = generateGuestOrderToken({
            orderId: createdOrder.id,
            orderNumber,
            stayId: stay.id,
            roomNumber: stay.roomNumber,
        });
        await client.query("UPDATE orders SET guest_order_token = $1 WHERE id = $2", [
            guestOrderToken,
            createdOrder.id,
        ]);
        // Insert order line items
        for (const line of validatedOrderItems) {
            await client.query(`INSERT INTO order_items (
          order_id, menu_item_id, item_name, unit_price, quantity,
          selected_modifiers, line_total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                createdOrder.id,
                line.menuItemId,
                line.itemName,
                line.unitPrice,
                line.quantity,
                JSON.stringify(line.selectedModifiers),
                line.lineTotal,
                line.notes || null,
            ]);
        }
        await client.query("COMMIT");
        const completeOrder = {
            ...createdOrder,
            guest_order_token: guestOrderToken,
            items: validatedOrderItems,
        };
        // Broadcast to Admin and Stay rooms in realtime
        broadcastOrderCreated(completeOrder);
        res.status(201).json({
            success: true,
            order: completeOrder,
            guestOrderToken,
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("[Orders] Create order error:", err);
        res.status(500).json({ error: "Failed to place order" });
    }
    finally {
        client.release();
    }
});
// Guest: Get orders for their active stay
router.get("/stay", requireActiveStay, async (req, res) => {
    const stay = req.stay;
    try {
        const ordersRes = await query(`SELECT o.*,
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'menuItemId', oi.menu_item_id,
                  'itemName', oi.item_name,
                  'unitPrice', oi.unit_price,
                  'quantity', oi.quantity,
                  'selectedModifiers', oi.selected_modifiers,
                  'lineTotal', oi.line_total,
                  'notes', oi.notes
                )
              ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.stay_id = $1
       GROUP BY o.id
       ORDER BY o.id DESC`, [stay.id]);
        res.json({ orders: ordersRes.rows });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to load stay orders" });
    }
});
// Guest / Staff: Get single order by ID
router.get("/:id", async (req, res) => {
    const orderId = Number(req.params.id);
    const stayToken = req.headers["x-stay-token"] || req.cookies?.stay_token;
    const staffToken = req.cookies?.staff_session || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    try {
        const orderRes = await query(`SELECT o.*,
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'menuItemId', oi.menu_item_id,
                  'itemName', oi.item_name,
                  'unitPrice', oi.unit_price,
                  'quantity', oi.quantity,
                  'selectedModifiers', oi.selected_modifiers,
                  'lineTotal', oi.line_total,
                  'notes', oi.notes
                )
              ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`, [orderId]);
        if (orderRes.rows.length === 0) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        res.json({ order: orderRes.rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch order" });
    }
});
// Guest: Cancel order (only while status is 'pending')
router.post("/:id/cancel", requireActiveStay, async (req, res) => {
    const orderId = Number(req.params.id);
    const stay = req.stay;
    try {
        const orderRes = await query("SELECT id, status, stay_id FROM orders WHERE id = $1", [orderId]);
        if (orderRes.rows.length === 0) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const order = orderRes.rows[0];
        if (order.stay_id !== stay.id) {
            res.status(403).json({ error: "Unauthorized access to this order" });
            return;
        }
        if (order.status !== "pending") {
            res.status(400).json({
                error: `Order cannot be cancelled because it is already ${order.status}. Please contact room service reception directly.`,
            });
            return;
        }
        const updateRes = await query("UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1 RETURNING *", [orderId]);
        const updated = updateRes.rows[0];
        broadcastOrderStatusChanged(updated, "pending");
        res.json({ success: true, message: "Order cancelled", order: updated });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to cancel order" });
    }
});
// Staff / Reception: List all orders with filters
router.get("/", requireStaff(["admin", "staff"]), async (req, res) => {
    const { status, room, date } = req.query;
    try {
        let sql = `
      SELECT o.*,
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menuItemId', oi.menu_item_id,
                 'itemName', oi.item_name,
                 'unitPrice', oi.unit_price,
                 'quantity', oi.quantity,
                 'selectedModifiers', oi.selected_modifiers,
                 'lineTotal', oi.line_total,
                 'notes', oi.notes
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            params.push(status);
            sql += ` AND o.status = $${params.length}`;
        }
        if (room) {
            params.push(`%${room}%`);
            sql += ` AND o.room_number ILIKE $${params.length}`;
        }
        if (date) {
            params.push(date);
            sql += ` AND DATE(o.created_at) = $${params.length}`;
        }
        sql += " GROUP BY o.id ORDER BY o.id DESC LIMIT 150";
        const result = await query(sql, params);
        res.json({ orders: result.rows });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
// Staff / Kitchen: Advance or update order status
router.patch("/:id/status", requireStaff(["admin", "staff", "kitchen"]), async (req, res) => {
    const orderId = Number(req.params.id);
    const staff = req.staff;
    const parse = updateOrderStatusSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0].message });
        return;
    }
    const { status: nextStatus, rejectionReason } = parse.data;
    try {
        const currentRes = await query("SELECT * FROM orders WHERE id = $1", [orderId]);
        if (currentRes.rows.length === 0) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const currentOrder = currentRes.rows[0];
        const prevStatus = currentOrder.status;
        // Role-based transition validation
        if (staff.role === "kitchen") {
            // Kitchen can only move accepted -> preparing, or preparing -> ready
            if (!(prevStatus === "accepted" && nextStatus === "preparing") &&
                !(prevStatus === "preparing" && nextStatus === "ready")) {
                res.status(403).json({
                    error: `Kitchen staff can only advance orders from 'accepted' to 'preparing' or 'preparing' to 'ready'. Current state: ${prevStatus}, requested: ${nextStatus}`,
                });
                return;
            }
        }
        // Reception/Admin transition checks
        if (staff.role === "staff" || staff.role === "admin") {
            const allowedTransitions = {
                pending: ["accepted", "rejected", "cancelled"],
                accepted: ["preparing", "rejected", "cancelled"],
                preparing: ["ready", "cancelled"],
                ready: ["out_for_delivery", "delivered", "cancelled"],
                out_for_delivery: ["delivered", "cancelled"],
                delivered: [],
                rejected: [],
                cancelled: [],
            };
            if (!allowedTransitions[prevStatus]?.includes(nextStatus)) {
                res.status(400).json({
                    error: `Invalid status transition from '${prevStatus}' to '${nextStatus}'.`,
                });
                return;
            }
        }
        let timestampCol = "";
        if (nextStatus === "accepted")
            timestampCol = ", accepted_at = NOW()";
        else if (nextStatus === "preparing")
            timestampCol = ", preparing_at = NOW()";
        else if (nextStatus === "ready")
            timestampCol = ", ready_at = NOW()";
        else if (nextStatus === "out_for_delivery")
            timestampCol = ", dispatched_at = NOW()";
        else if (nextStatus === "delivered")
            timestampCol = ", delivered_at = NOW()";
        else if (nextStatus === "cancelled")
            timestampCol = ", cancelled_at = NOW()";
        const updateSql = `
      UPDATE orders
      SET status = $1, rejection_reason = COALESCE($2, rejection_reason) ${timestampCol}
      WHERE id = $3
      RETURNING *
    `;
        const updateRes = await query(updateSql, [nextStatus, rejectionReason || null, orderId]);
        const updatedOrder = updateRes.rows[0];
        // Audit log
        await query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
       VALUES ($1, $2, $3, 'ORDER_STATUS_UPDATE', 'order', $4, $5)`, [
            staff.propertyId,
            staff.id,
            staff.username,
            String(orderId),
            JSON.stringify({ from: prevStatus, to: nextStatus, rejectionReason }),
        ]);
        // Fetch items to broadcast rich payload
        const itemsRes = await query(`SELECT id, menu_item_id as "menuItemId", item_name as "itemName",
              unit_price as "unitPrice", quantity, selected_modifiers as "selectedModifiers",
              line_total as "lineTotal", notes
       FROM order_items WHERE order_id = $1`, [orderId]);
        updatedOrder.items = itemsRes.rows;
        broadcastOrderStatusChanged(updatedOrder, prevStatus);
        res.json({ success: true, order: updatedOrder });
    }
    catch (err) {
        console.error("[Orders] Status update error:", err);
        res.status(500).json({ error: "Failed to update order status" });
    }
});
export default router;
