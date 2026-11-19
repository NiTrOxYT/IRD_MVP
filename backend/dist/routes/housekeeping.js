import { Router } from "express";
import { query } from "../db/index.js";
import { requireActiveStay } from "../middleware/stayAuth.js";
import { requireStaff } from "../middleware/auth.js";
import { broadcastHousekeepingCreated, broadcastHousekeepingStatusChanged, } from "../socket.js";
const router = Router();
export const REQUEST_TITLES = {
    cleaning: "Room Cleaning & Refresh",
    towels: "Fresh Bath Towels & Mats",
    toiletries: "Luxury Toiletries & Amenities",
    linen: "Fresh Bed Linen & Pillowcases",
    pillows_blankets: "Extra Pillows & Blankets",
    luggage: "Luggage & Porter Assistance",
    turndown: "Evening Turndown Service",
    other: "In-Suite Guest Assistance",
};
// ==========================================
// 1. GUEST HOUSEKEEPING ENDPOINTS
// ==========================================
// Guest: List active stay requests
router.get("/guest", requireActiveStay, async (req, res) => {
    const stay = req.stay;
    try {
        const result = await query(`SELECT id, stay_id, room_number, guest_name, request_type, title, guest_note,
              status, assigned_staff_name, staff_notes, created_at, accepted_at, started_at,
              completed_at, declined_at
       FROM housekeeping_requests
       WHERE stay_id = $1
       ORDER BY id DESC`, [stay.id]);
        res.json({ success: true, requests: result.rows });
    }
    catch (err) {
        console.error("[Housekeeping] Guest fetch error:", err);
        res.status(500).json({ error: "Failed to load housekeeping requests." });
    }
});
// Guest: Submit request with rapid double-tap prevention
router.post("/guest", requireActiveStay, async (req, res) => {
    const stay = req.stay;
    const { requestType, guestNote } = req.body;
    if (!requestType || typeof requestType !== "string") {
        res.status(400).json({ error: "Service request type is required." });
        return;
    }
    const cleanType = requestType.trim().toLowerCase();
    if (!Object.hasOwn(REQUEST_TITLES, cleanType)) {
        res.status(400).json({ error: "Choose a valid housekeeping service." });
        return;
    }
    const note = typeof guestNote === "string" ? guestNote.trim() : "";
    if (note.length > 500) {
        res.status(400).json({ error: "Request notes must be 500 characters or fewer." });
        return;
    }
    const title = REQUEST_TITLES[cleanType];
    try {
        // Prevent duplicate submissions within 30 seconds of an identical pending request
        const dupCheck = await query(`SELECT id, created_at FROM housekeeping_requests
       WHERE stay_id = $1 AND request_type = $2 AND status = 'pending'
         AND created_at > (NOW() - INTERVAL '30 seconds')
       ORDER BY id DESC LIMIT 1`, [stay.id, cleanType]);
        if (dupCheck.rows.length > 0) {
            res.status(409).json({
                error: "A request for this service was just submitted. Our team is already notified.",
                existingRequestId: dupCheck.rows[0].id,
            });
            return;
        }
        const insertRes = await query(`INSERT INTO housekeeping_requests (
        property_id, stay_id, room_id, room_number, guest_name,
        request_type, title, guest_note, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
      RETURNING *`, [
            stay.propertyId,
            stay.id,
            stay.roomId,
            stay.roomNumber,
            stay.guestName,
            cleanType,
            title,
            note || null,
        ]);
        const created = insertRes.rows[0];
        // Real-time broadcast to housekeeping staff and guest room
        broadcastHousekeepingCreated(created);
        res.status(201).json({
            success: true,
            message: "Housekeeping request submitted successfully.",
            request: created,
        });
    }
    catch (err) {
        console.error("[Housekeeping] Guest create error:", err);
        res.status(500).json({ error: "Failed to submit housekeeping request." });
    }
});
// ==========================================
// 2. STAFF HOUSEKEEPING ENDPOINTS
// ==========================================
// Staff: Summary KPIs
router.get("/summary", requireStaff(["admin", "housekeeping", "housekeeping:view"]), async (req, res) => {
    const propertyId = req.staff.propertyId;
    try {
        const summaryRes = await query(`SELECT
          COUNT(*) FILTER (WHERE status = 'pending') AS "pendingCount",
          COUNT(*) FILTER (WHERE status = 'in_progress' OR status = 'accepted') AS "inProgressCount",
          COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE) AS "completedTodayCount",
          COUNT(*) FILTER (WHERE status IN ('pending', 'accepted', 'in_progress')) AS "activeCount"
         FROM housekeeping_requests
         WHERE property_id = $1`, [propertyId]);
        const row = summaryRes.rows[0];
        res.json({
            success: true,
            summary: {
                pendingCount: parseInt(row.pendingCount || "0", 10),
                inProgressCount: parseInt(row.inProgressCount || "0", 10),
                completedTodayCount: parseInt(row.completedTodayCount || "0", 10),
                activeCount: parseInt(row.activeCount || "0", 10),
            },
        });
    }
    catch (err) {
        console.error("[Housekeeping] Summary error:", err);
        res.status(500).json({ error: "Failed to load summary." });
    }
});
// Staff: List requests with filters
router.get("/", requireStaff(["admin", "housekeeping", "housekeeping:view"]), async (req, res) => {
    const propertyId = req.staff.propertyId;
    const { status, room, requestType, limit = 100, offset = 0 } = req.query;
    const conditions = ["hr.property_id = $1"];
    const values = [propertyId];
    let idx = 2;
    if (status && status !== "all") {
        conditions.push(`hr.status = $${idx++}`);
        values.push(String(status));
    }
    if (room && String(room).trim()) {
        conditions.push(`hr.room_number ILIKE $${idx++}`);
        values.push(`%${String(room).trim()}%`);
    }
    if (requestType && requestType !== "all") {
        conditions.push(`hr.request_type = $${idx++}`);
        values.push(String(requestType));
    }
    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    try {
        const listRes = await query(`SELECT hr.*
         FROM housekeeping_requests hr
         ${whereClause}
         ORDER BY 
           CASE 
             WHEN hr.status = 'pending' THEN 1 
             WHEN hr.status = 'accepted' THEN 2 
             WHEN hr.status = 'in_progress' THEN 3 
             ELSE 4 
           END,
           hr.id DESC
         LIMIT $${idx++} OFFSET $${idx++}`, [...values, Number(limit), Number(offset)]);
        res.json({ success: true, requests: listRes.rows });
    }
    catch (err) {
        console.error("[Housekeeping] Staff fetch error:", err);
        res.status(500).json({ error: "Failed to fetch housekeeping queue." });
    }
});
// Staff: Update request status (accept, start, complete, decline)
router.patch("/:id/status", requireStaff(["admin", "housekeeping", "housekeeping:edit"]), async (req, res) => {
    const propertyId = req.staff.propertyId;
    const requestId = Number(req.params.id);
    const { status: nextStatus, staffNotes } = req.body;
    const staff = req.staff;
    const validStatuses = ["pending", "accepted", "in_progress", "completed", "declined"];
    if (!nextStatus || !validStatuses.includes(nextStatus)) {
        res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
        return;
    }
    try {
        const currentRes = await query("SELECT * FROM housekeeping_requests WHERE id = $1 AND property_id = $2", [requestId, propertyId]);
        if (currentRes.rows.length === 0) {
            res.status(404).json({ error: "Request not found." });
            return;
        }
        const current = currentRes.rows[0];
        const prevStatus = current.status;
        const allowedTransitions = {
            pending: ["accepted", "declined"],
            accepted: ["in_progress", "declined"],
            in_progress: ["completed", "declined"],
            completed: [],
            declined: [],
        };
        if (!allowedTransitions[prevStatus]?.includes(nextStatus)) {
            res.status(409).json({ error: `Cannot move a ${prevStatus} request to ${nextStatus}.` });
            return;
        }
        if (typeof staffNotes === "string" && staffNotes.length > 500) {
            res.status(400).json({ error: "Staff notes must be 500 characters or fewer." });
            return;
        }
        let timestampCol = "";
        if (nextStatus === "accepted")
            timestampCol = ", accepted_at = NOW()";
        else if (nextStatus === "in_progress")
            timestampCol = ", started_at = NOW()";
        else if (nextStatus === "completed")
            timestampCol = ", completed_at = NOW()";
        else if (nextStatus === "declined")
            timestampCol = ", declined_at = NOW()";
        const staffName = staff.fullName || staff.username;
        const updateRes = await query(`UPDATE housekeeping_requests
         SET status = $1,
             assigned_staff_id = $2,
             assigned_staff_name = $3,
             staff_notes = COALESCE($4, staff_notes)
             ${timestampCol}
         WHERE id = $5 AND property_id = $6
         RETURNING *`, [nextStatus, staff.id, staffName, staffNotes?.trim() || null, requestId, propertyId]);
        const updated = updateRes.rows[0];
        // Audit Log
        await query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'HOUSEKEEPING_STATUS_UPDATE', 'housekeeping', $4, $5)`, [
            propertyId,
            staff.id,
            staff.username,
            String(requestId),
            JSON.stringify({
                roomNumber: current.room_number,
                requestType: current.request_type,
                from: prevStatus,
                to: nextStatus,
                staffNotes,
            }),
        ]);
        // Realtime broadcast
        broadcastHousekeepingStatusChanged(updated, prevStatus);
        res.json({ success: true, request: updated });
    }
    catch (err) {
        console.error("[Housekeeping] Status update error:", err);
        res.status(500).json({ error: "Failed to update status." });
    }
});
export default router;
