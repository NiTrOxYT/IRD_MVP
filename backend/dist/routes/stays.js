import { Router } from "express";
import { query } from "../db/index.js";
import { generateStayToken } from "../lib/tokens.js";
import { createStaySchema } from "../lib/validation.js";
import { requireStaff } from "../middleware/auth.js";
import { broadcastStayCreated, broadcastStayInvalidated } from "../socket.js";
const router = Router();
// Guest verification endpoint
router.get("/verify", async (req, res) => {
    const token = req.query.token || req.headers["x-stay-token"];
    if (!token) {
        res.status(400).json({ error: "Stay access token required", code: "TOKEN_MISSING" });
        return;
    }
    try {
        const result = await query(`SELECT s.id, s.property_id, s.guest_name, s.guest_phone, s.stay_token,
              s.check_in_at, s.check_out_at, s.status, s.notes,
              r.id as room_id, r.room_number, r.floor, r.wing,
              p.name as property_name, p.currency, p.tax_rate_percent, p.service_charge_percent, p.ird_enabled, p.logo_url
       FROM stays s
       JOIN rooms r ON s.room_id = r.id
       JOIN properties p ON s.property_id = p.id
       WHERE s.stay_token = $1`, [token]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Invalid stay access token", code: "NOT_FOUND" });
            return;
        }
        const row = result.rows[0];
        if (row.status !== "active") {
            res.status(403).json({
                error: "This stay is no longer active. In-room dining access has expired.",
                code: "STAY_EXPIRED",
                status: row.status,
            });
            return;
        }
        res.json({
            stay: {
                id: row.id,
                guestName: row.guest_name,
                stayToken: row.stay_token,
                status: row.status,
                checkInAt: row.check_in_at,
                notes: row.notes,
                room: {
                    id: row.room_id,
                    roomNumber: row.room_number,
                    floor: row.floor,
                    wing: row.wing,
                },
            },
            property: {
                name: row.property_name,
                currency: row.currency,
                taxRatePercent: Number(row.tax_rate_percent),
                serviceChargePercent: Number(row.service_charge_percent),
                irdEnabled: row.ird_enabled,
                logoUrl: row.logo_url,
            },
        });
    }
    catch (err) {
        console.error("[Stays] verify error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Staff: List stays
router.get("/", requireStaff("stays:view"), async (req, res) => {
    const statusFilter = req.query.status;
    try {
        let sql = `
      SELECT s.id, s.property_id, s.guest_name, s.guest_phone, s.stay_token,
             s.check_in_at, s.check_out_at, s.status, s.notes,
             r.id as room_id, r.room_number, r.floor, r.wing,
             (SELECT COUNT(*) FROM orders o WHERE o.stay_id = s.id) as order_count
      FROM stays s
      JOIN rooms r ON s.room_id = r.id
    `;
        const params = [];
        if (statusFilter) {
            sql += " WHERE s.status = $1";
            params.push(statusFilter);
        }
        sql += " ORDER BY s.id DESC LIMIT 100";
        const result = await query(sql, params);
        res.json({ stays: result.rows });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch stays" });
    }
});
// Staff: Check-in a stay
router.post("/", requireStaff("stays:create"), async (req, res) => {
    const parseResult = createStaySchema.safeParse(req.body);
    if (!parseResult.success) {
        res.status(400).json({ error: parseResult.error.errors[0].message });
        return;
    }
    const { roomId, guestName, guestPhone, notes } = parseResult.data;
    const staff = req.staff;
    try {
        // Check if room exists
        const roomRes = await query("SELECT id, room_number, is_active FROM rooms WHERE id = $1", [roomId]);
        if (roomRes.rows.length === 0) {
            res.status(404).json({ error: "Room not found" });
            return;
        }
        // Check if there is already an active stay in this room; if so, close it
        const activeStayRes = await query("SELECT id FROM stays WHERE room_id = $1 AND status = 'active'", [roomId]);
        for (const oldStay of activeStayRes.rows) {
            await query("UPDATE stays SET status = 'checked_out', check_out_at = NOW() WHERE id = $1", [oldStay.id]);
            broadcastStayInvalidated(oldStay.id);
        }
        const stayToken = generateStayToken();
        const insertRes = await query(`INSERT INTO stays (property_id, room_id, guest_name, guest_phone, stay_token, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)
       RETURNING *`, [staff.propertyId, roomId, guestName.trim(), guestPhone?.trim() || null, stayToken, notes?.trim() || null]);
        const newStay = insertRes.rows[0];
        // Audit log
        await query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
       VALUES ($1, $2, $3, 'STAY_CHECKIN', 'stay', $4, $5)`, [
            staff.propertyId,
            staff.id,
            staff.username,
            String(newStay.id),
            JSON.stringify({ roomId, roomNumber: roomRes.rows[0].room_number, guestName }),
        ]);
        broadcastStayCreated(newStay);
        res.status(201).json({
            success: true,
            stay: {
                ...newStay,
                roomNumber: roomRes.rows[0].room_number,
            },
        });
    }
    catch (err) {
        console.error("[Stays] Check-in error:", err);
        res.status(500).json({ error: "Failed to check in stay" });
    }
});
// Staff: Check-out a stay
router.post("/:id/checkout", requireStaff("stays:edit"), async (req, res) => {
    const stayId = Number(req.params.id);
    const staff = req.staff;
    try {
        const checkRes = await query("SELECT id, status, room_id, guest_name FROM stays WHERE id = $1", [stayId]);
        if (checkRes.rows.length === 0) {
            res.status(404).json({ error: "Stay not found" });
            return;
        }
        const stay = checkRes.rows[0];
        if (stay.status === "checked_out") {
            res.status(400).json({ error: "Stay is already checked out" });
            return;
        }
        await query("UPDATE stays SET status = 'checked_out', check_out_at = NOW() WHERE id = $1", [stayId]);
        // Audit log
        await query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
       VALUES ($1, $2, $3, 'STAY_CHECKOUT', 'stay', $4, $5)`, [staff.propertyId, staff.id, staff.username, String(stayId), JSON.stringify({ guestName: stay.guest_name })]);
        // Invalidate guest screens in realtime
        broadcastStayInvalidated(stayId);
        res.json({ success: true, message: "Stay checked out successfully. Room access invalidated." });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to check out stay" });
    }
});
// Staff: Revoke access
router.post("/:id/revoke", requireStaff("stays:edit"), async (req, res) => {
    const stayId = Number(req.params.id);
    const staff = req.staff;
    try {
        await query("UPDATE stays SET status = 'revoked', check_out_at = NOW() WHERE id = $1", [stayId]);
        await query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
       VALUES ($1, $2, $3, 'STAY_REVOKE', 'stay', $4, $5)`, [staff.propertyId, staff.id, staff.username, String(stayId), JSON.stringify({ reason: req.body.reason || "Staff revocation" })]);
        broadcastStayInvalidated(stayId);
        res.json({ success: true, message: "Room access revoked." });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to revoke access" });
    }
});
export default router;
