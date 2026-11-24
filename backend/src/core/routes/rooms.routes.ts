import { Router, Request, Response } from "express";
import { query } from "../db/index.js";
import { requireStaff } from "../auth/middleware.js";
import { generateRoomQrToken } from "../stay/tokens.js";

export function createRoomsRouter(): Router {
  const router = Router();

  router.get("/", requireStaff({ permissions: ["stays:view", "qr:view"] }), async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await query(`
        SELECT r.id, r.property_id, r.room_number, r.floor, r.wing, r.qr_token, r.is_active,
               s.id as active_stay_id, s.guest_name, s.stay_token, s.check_in_at
        FROM rooms r
        LEFT JOIN stays s ON s.room_id = r.id AND s.status = 'active'
        ORDER BY r.room_number ASC
      `);

      res.json({ rooms: result.rows });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  router.get("/resolve-qr/:qrToken", async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await query(
        `SELECT s.stay_token
         FROM rooms r
         JOIN stays s ON s.room_id = r.id AND s.status = 'active'
         WHERE r.qr_token = $1 AND r.is_active = TRUE
         LIMIT 1`,
        [req.params.qrToken]
      );
      if (!result.rows.length) {
        res.status(404).json({ error: "This room has no active guest stay. Please contact Reception." });
        return;
      }
      res.setHeader("Cache-Control", "no-store");
      res.json({ stayToken: result.rows[0].stay_token });
    } catch (err) {
      console.error("[Rooms] QR resolve error:", err);
      res.status(500).json({ error: "Could not verify this room QR code." });
    }
  });

  router.post("/", requireStaff("stays:create"), async (req: Request, res: Response): Promise<void> => {
    const { roomNumber, floor, wing } = req.body;
    if (!roomNumber) {
      res.status(400).json({ error: "Room number is required" });
      return;
    }

    const staff = req.staff!;
    try {
      const result = await query(
        `INSERT INTO rooms (property_id, room_number, floor, wing, qr_token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [staff.propertyId, roomNumber.trim(), floor?.trim() || null, wing?.trim() || null, generateRoomQrToken()]
      );

      res.status(201).json({ success: true, room: result.rows[0] });
    } catch (err: any) {
      if (err.code === "23505") {
        res.status(409).json({ error: "A room with this number already exists" });
        return;
      }
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  return router;
}
