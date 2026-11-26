import { Router } from "express";
import { createInboxMessageSchema, inboxStatusSchema } from "../validation.js";
function serializeMessage(row, roomMap = new Map()) {
    const roomIds = Array.isArray(row.target_room_ids)
        ? row.target_room_ids.map(Number).filter((n) => Number.isFinite(n))
        : [];
    return {
        id: row.id,
        propertyId: row.property_id,
        title: row.title,
        body: row.body,
        category: row.category || "Notice",
        targetType: row.target_type === "rooms" ? "rooms" : "all",
        targetRoomIds: roomIds,
        targetRoomNumbers: roomIds.map((id) => roomMap.get(id) || `#${id}`),
        createdByName: row.created_by_name ?? null,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        ...(row.is_read !== undefined ? { isRead: Boolean(row.is_read) } : {}),
        ...(row.read_at !== undefined ? { readAt: row.read_at } : {}),
        ...(row.read_count !== undefined ? { readCount: Number(row.read_count) } : {}),
    };
}
export function createInboxRouter(deps) {
    const { db, auth, realtime } = deps;
    const { requireActiveStay, requireStaff } = auth;
    const router = Router();
    async function buildRoomNumberMap(propertyId) {
        const roomsRes = await db.query(`SELECT id, room_number FROM rooms WHERE property_id = $1`, [propertyId]);
        const map = new Map();
        for (const r of roomsRes.rows) {
            map.set(Number(r.id), String(r.room_number));
        }
        return map;
    }
    // Guest: Fetch notifications for this active stay (all-room broadcasts + room-targeted messages)
    router.get("/guest", requireActiveStay, async (req, res) => {
        const stay = req.stay;
        try {
            const [msgRes, roomMap] = await Promise.all([
                db.query(`SELECT gm.*,
                  (gmr.read_at IS NOT NULL) AS is_read,
                  gmr.read_at
           FROM guest_messages gm
           LEFT JOIN guest_message_reads gmr
             ON gmr.message_id = gm.id AND gmr.stay_id = $1
           WHERE gm.property_id = $2
             AND gm.is_active = TRUE
             AND (
               gm.target_type = 'all'
               OR (
                 gm.target_type = 'rooms'
                 AND gm.target_room_ids @> to_jsonb(ARRAY[$3::int])
                 AND gm.created_at >= ($4::timestamp - INTERVAL '12 hours')
               )
             )
           ORDER BY gm.created_at DESC, gm.id DESC
           LIMIT 60`, [stay.id, stay.propertyId, stay.roomId, stay.checkInAt]),
                buildRoomNumberMap(stay.propertyId),
            ]);
            const messages = msgRes.rows.map((r) => serializeMessage(r, roomMap));
            const unreadCount = messages.filter((m) => !m.isRead).length;
            res.json({ success: true, messages, unreadCount });
        }
        catch (err) {
            console.error("[Inbox] Guest list error:", err);
            res.status(500).json({ error: "Failed to load inbox messages." });
        }
    });
    // Guest: Mark single message as read
    router.post("/guest/:id/read", requireActiveStay, async (req, res) => {
        const stay = req.stay;
        const messageId = Number(req.params.id);
        if (!Number.isInteger(messageId) || messageId <= 0) {
            res.status(400).json({ error: "Invalid message ID." });
            return;
        }
        try {
            const checkRes = await db.query(`SELECT id FROM guest_messages
         WHERE id = $1 AND property_id = $2 AND is_active = TRUE
           AND (target_type = 'all' OR target_room_ids @> to_jsonb(ARRAY[$3::int]))`, [messageId, stay.propertyId, stay.roomId]);
            if (checkRes.rows.length === 0) {
                res.status(404).json({ error: "Message not found for this stay." });
                return;
            }
            await db.query(`INSERT INTO guest_message_reads (message_id, stay_id)
         VALUES ($1, $2)
         ON CONFLICT (message_id, stay_id) DO NOTHING`, [messageId, stay.id]);
            res.json({ success: true });
        }
        catch (err) {
            console.error("[Inbox] Mark read error:", err);
            res.status(500).json({ error: "Failed to mark message as read." });
        }
    });
    // Guest: Mark all visible messages as read
    router.post("/guest/read-all", requireActiveStay, async (req, res) => {
        const stay = req.stay;
        try {
            await db.query(`INSERT INTO guest_message_reads (message_id, stay_id)
         SELECT gm.id, $1
         FROM guest_messages gm
         WHERE gm.property_id = $2
           AND gm.is_active = TRUE
           AND (
             gm.target_type = 'all'
             OR (
               gm.target_type = 'rooms'
               AND gm.target_room_ids @> to_jsonb(ARRAY[$3::int])
               AND gm.created_at >= ($4::timestamp - INTERVAL '12 hours')
             )
           )
         ON CONFLICT (message_id, stay_id) DO NOTHING`, [stay.id, stay.propertyId, stay.roomId, stay.checkInAt]);
            res.json({ success: true });
        }
        catch (err) {
            console.error("[Inbox] Mark all read error:", err);
            res.status(500).json({ error: "Failed to mark messages as read." });
        }
    });
    // Admin: List sent notifications with target room numbers & read counts
    router.get("/", requireStaff("inbox:view"), async (req, res) => {
        const propertyId = req.staff.propertyId;
        try {
            const [msgRes, roomMap] = await Promise.all([
                db.query(`SELECT gm.*, COUNT(gmr.stay_id)::int AS read_count
           FROM guest_messages gm
           LEFT JOIN guest_message_reads gmr ON gmr.message_id = gm.id
           WHERE gm.property_id = $1
           GROUP BY gm.id
           ORDER BY gm.created_at DESC, gm.id DESC
           LIMIT 100`, [propertyId]),
                buildRoomNumberMap(propertyId),
            ]);
            res.json({
                success: true,
                messages: msgRes.rows.map((r) => serializeMessage(r, roomMap)),
            });
        }
        catch (err) {
            console.error("[Inbox] Admin list error:", err);
            res.status(500).json({ error: "Failed to load inbox history." });
        }
    });
    // Admin: Send notification to specific rooms or all rooms
    router.post("/", requireStaff("inbox:create"), async (req, res) => {
        const parse = createInboxMessageSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: parse.error.errors[0].message });
            return;
        }
        const d = parse.data;
        const staff = req.staff;
        try {
            const roomMap = await buildRoomNumberMap(staff.propertyId);
            if (d.targetType === "rooms") {
                const invalidIds = d.targetRoomIds.filter((id) => !roomMap.has(id));
                if (invalidIds.length > 0) {
                    res.status(400).json({ error: "One or more selected rooms do not belong to this property." });
                    return;
                }
            }
            const insertRes = await db.query(`INSERT INTO guest_messages
           (property_id, title, body, category, target_type, target_room_ids, created_by_staff_id, created_by_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
         RETURNING *`, [
                staff.propertyId,
                d.title,
                d.body,
                d.category,
                d.targetType,
                JSON.stringify(d.targetRoomIds),
                staff.id,
                staff.username,
                d.isActive,
            ]);
            const created = serializeMessage({ ...insertRes.rows[0], read_count: 0 }, roomMap);
            await db.query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'INBOX_MESSAGE_SENT', 'guest_message', $4, $5)`, [
                staff.propertyId,
                staff.id,
                staff.username,
                String(created.id),
                JSON.stringify({
                    title: created.title,
                    targetType: created.targetType,
                    targetRoomNumbers: created.targetRoomNumbers,
                }),
            ]);
            // Broadcast in real time to active guest stay rooms
            if (created.isActive) {
                const targetStaysRes = created.targetType === "all"
                    ? await db.query(`SELECT id FROM stays WHERE property_id = $1 AND status = 'active'`, [staff.propertyId])
                    : await db.query(`SELECT id FROM stays WHERE property_id = $1 AND status = 'active' AND room_id = ANY($2::int[])`, [staff.propertyId, created.targetRoomIds]);
                const guestPayload = { ...created, isRead: false, readAt: null };
                for (const s of targetStaysRes.rows) {
                    realtime.emitToRoom(`stay:${s.id}`, "inbox:message", guestPayload);
                }
            }
            res.status(201).json({ success: true, message: created });
        }
        catch (err) {
            console.error("[Inbox] Send error:", err);
            res.status(500).json({ error: "Failed to push guest notification." });
        }
    });
    // Admin: Toggle active/hidden state
    router.patch("/:id/status", requireStaff("inbox:edit"), async (req, res) => {
        const id = Number(req.params.id);
        const parse = inboxStatusSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: parse.error.errors[0].message });
            return;
        }
        const staff = req.staff;
        try {
            const result = await db.query(`UPDATE guest_messages SET is_active = $1 WHERE id = $2 AND property_id = $3 RETURNING *`, [parse.data.isActive, id, staff.propertyId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "Message not found." });
                return;
            }
            const roomMap = await buildRoomNumberMap(staff.propertyId);
            res.json({ success: true, message: serializeMessage(result.rows[0], roomMap) });
        }
        catch (err) {
            console.error("[Inbox] Status toggle error:", err);
            res.status(500).json({ error: "Failed to update notification status." });
        }
    });
    // Admin: Delete notification
    router.delete("/:id", requireStaff("inbox:delete"), async (req, res) => {
        const id = Number(req.params.id);
        const staff = req.staff;
        try {
            const result = await db.query(`DELETE FROM guest_messages WHERE id = $1 AND property_id = $2 RETURNING id, title`, [id, staff.propertyId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "Message not found." });
                return;
            }
            res.json({ success: true, message: "Notification deleted." });
        }
        catch (err) {
            console.error("[Inbox] Delete error:", err);
            res.status(500).json({ error: "Failed to delete notification." });
        }
    });
    return router;
}
