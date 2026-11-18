import { Router, Request, Response } from "express";
import { query } from "../db/index.js";
import { requireStaff } from "../middleware/auth.js";

const router = Router();

router.get("/", requireStaff(["admin", "staff"]), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT r.id, r.property_id, r.room_number, r.floor, r.wing, r.is_active,
             s.id as active_stay_id, s.guest_name, s.stay_token, s.guest_pin, s.check_in_at
      FROM rooms r
      LEFT JOIN stays s ON s.room_id = r.id AND s.status = 'active'
      ORDER BY r.room_number ASC
    `);

    res.json({ rooms: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

router.post("/", requireStaff(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const { roomNumber, floor, wing } = req.body;
  if (!roomNumber) {
    res.status(400).json({ error: "Room number is required" });
    return;
  }

  const staff = req.staff!;
  try {
    const result = await query(
      `INSERT INTO rooms (property_id, room_number, floor, wing)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [staff.propertyId, roomNumber.trim(), floor?.trim() || null, wing?.trim() || null]
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

export default router;
