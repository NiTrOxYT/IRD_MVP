import { Router } from "express";
import { query } from "../db/index.js";
import { requireStaff } from "../middleware/auth.js";
import { broadcastOrderStatusChanged } from "../socket.js";
const router = Router();
// Kitchen: Get active kitchen tickets
router.get("/tickets", requireStaff("orders:view"), async (_req, res) => {
    try {
        const result = await query(`
      SELECT o.id, o.order_number, o.room_number, o.guest_name, o.status,
             o.special_instructions, o.created_at, o.accepted_at, o.preparing_at, o.ready_at,
             EXTRACT(EPOCH FROM (NOW() - o.created_at)) as elapsed_seconds,
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'itemName', oi.item_name,
                 'variantName', oi.variant_name,
                 'quantity', oi.quantity,
                 'selectedModifiers', oi.selected_modifiers,
                 'notes', oi.notes
               )
             ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status IN ('accepted', 'preparing', 'ready')
      GROUP BY o.id
      ORDER BY 
        CASE o.status
          WHEN 'accepted' THEN 1
          WHEN 'preparing' THEN 2
          WHEN 'ready' THEN 3
          ELSE 4
        END,
        o.created_at ASC
    `);
        res.json({ tickets: result.rows });
    }
    catch (err) {
        console.error("[Kitchen] tickets error:", err);
        res.status(500).json({ error: "Failed to load kitchen tickets" });
    }
});
// Kitchen: Advance ticket status
router.post("/tickets/:id/advance", requireStaff("orders:edit"), async (req, res) => {
    const orderId = Number(req.params.id);
    const staff = req.staff;
    try {
        const currentRes = await query("SELECT * FROM orders WHERE id = $1", [orderId]);
        if (currentRes.rows.length === 0) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const currentOrder = currentRes.rows[0];
        let nextStatus = "";
        let timestampCol = "";
        if (currentOrder.status === "accepted") {
            nextStatus = "preparing";
            timestampCol = ", preparing_at = NOW()";
        }
        else if (currentOrder.status === "preparing") {
            nextStatus = "ready";
            timestampCol = ", ready_at = NOW()";
        }
        else {
            res.status(400).json({
                error: `Cannot advance ticket in status '${currentOrder.status}' from kitchen console.`,
            });
            return;
        }
        const updateRes = await query(`UPDATE orders SET status = $1 ${timestampCol} WHERE id = $2 RETURNING *`, [nextStatus, orderId]);
        const updatedOrder = updateRes.rows[0];
        // Audit log
        await query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
       VALUES ($1, $2, $3, 'KOT_ADVANCE', 'order', $4, $5)`, [
            staff.propertyId,
            staff.id,
            staff.username,
            String(orderId),
            JSON.stringify({ from: currentOrder.status, to: nextStatus }),
        ]);
        const itemsRes = await query(`SELECT id, item_name as "itemName", variant_name as "variantName", quantity, selected_modifiers as "selectedModifiers", notes
       FROM order_items WHERE order_id = $1`, [orderId]);
        updatedOrder.items = itemsRes.rows;
        broadcastOrderStatusChanged(updatedOrder, currentOrder.status);
        res.json({ success: true, order: updatedOrder });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to advance kitchen ticket" });
    }
});
export default router;
