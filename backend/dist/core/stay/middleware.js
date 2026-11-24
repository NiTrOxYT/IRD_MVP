import { query } from "../db/index.js";
export async function requireActiveStay(req, res, next) {
    const stayToken = req.headers["x-stay-token"] ||
        req.cookies?.stay_token ||
        req.query.stayToken ||
        req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!stayToken) {
        res.status(401).json({
            error: "Room access credentials required. Please scan your in-room QR code.",
            code: "STAY_TOKEN_REQUIRED",
        });
        return;
    }
    try {
        const result = await query(`SELECT s.id, s.property_id, s.room_id, s.guest_name, s.status, s.check_in_at, s.notes,
              r.room_number, r.floor, r.wing
       FROM stays s
       JOIN rooms r ON s.room_id = r.id
       WHERE s.stay_token = $1`, [stayToken]);
        if (result.rows.length === 0) {
            res.status(401).json({
                error: "Unrecognized room access token. Please check in with reception.",
                code: "INVALID_STAY_TOKEN",
            });
            return;
        }
        const row = result.rows[0];
        if (row.status !== "active") {
            res.status(403).json({
                error: "Room access has expired or was revoked at checkout. Please contact reception.",
                code: "STAY_NOT_ACTIVE",
                status: row.status,
            });
            return;
        }
        req.stay = {
            id: row.id,
            propertyId: row.property_id,
            roomId: row.room_id,
            roomNumber: row.room_number,
            guestName: row.guest_name,
            status: row.status,
            checkInAt: row.check_in_at,
            notes: row.notes,
        };
        next();
    }
    catch (err) {
        console.error("[stayAuth] Database lookup error:", err);
        res.status(500).json({ error: "Failed to verify stay status", code: "DATABASE_ERROR" });
    }
}
