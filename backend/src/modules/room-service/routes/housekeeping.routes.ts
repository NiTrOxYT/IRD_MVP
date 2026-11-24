import { Router, Request, Response } from "express";
import type { RoomServiceModuleDeps } from "../types.js";
import {
  REQUEST_TITLES,
  VALID_HOUSEKEEPING_STATUSES,
  ALLOWED_HOUSEKEEPING_TRANSITIONS,
} from "../catalog.js";
import { createRoomServiceBroadcasters } from "../realtime.js";

export function createHousekeepingRouter(deps: RoomServiceModuleDeps): Router {
  const { db, auth } = deps;
  const { requireActiveStay, requireStaff } = auth;
  const { broadcastHousekeepingCreated, broadcastHousekeepingStatusChanged } =
    createRoomServiceBroadcasters(deps);

  const router = Router();

  // Guest: List active stay requests
  router.get("/guest", requireActiveStay, async (req: Request, res: Response): Promise<void> => {
    const stay = req.stay!;
    try {
      const result = await db.query(
        `SELECT id, stay_id, room_number, guest_name, request_type, title, guest_note,
                status, assigned_staff_name, staff_notes, created_at, accepted_at, started_at,
                completed_at, declined_at
         FROM housekeeping_requests
         WHERE stay_id = $1
         ORDER BY id DESC`,
        [stay.id]
      );

      res.json({ success: true, requests: result.rows });
    } catch (err) {
      console.error("[Housekeeping] Guest fetch error:", err);
      res.status(500).json({ error: "Failed to load housekeeping requests." });
    }
  });

  // Guest: Submit request with rapid double-tap prevention
  router.post("/guest", requireActiveStay, async (req: Request, res: Response): Promise<void> => {
    const stay = req.stay!;
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
      const dupCheck = await db.query(
        `SELECT id, created_at FROM housekeeping_requests
         WHERE stay_id = $1 AND request_type = $2 AND status = 'pending'
           AND created_at > (NOW() - INTERVAL '30 seconds')
         ORDER BY id DESC LIMIT 1`,
        [stay.id, cleanType]
      );

      if (dupCheck.rows.length > 0) {
        res.status(409).json({
          error: "A request for this service was just submitted. Our team is already notified.",
          existingRequestId: dupCheck.rows[0].id,
        });
        return;
      }

      const insertRes = await db.query(
        `INSERT INTO housekeeping_requests (
          property_id, stay_id, room_id, room_number, guest_name,
          request_type, title, guest_note, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
        RETURNING *`,
        [
          stay.propertyId,
          stay.id,
          stay.roomId,
          stay.roomNumber,
          stay.guestName,
          cleanType,
          title,
          note || null,
        ]
      );

      const created = insertRes.rows[0];
      broadcastHousekeepingCreated(created);

      res.status(201).json({
        success: true,
        message: "Housekeeping request submitted successfully.",
        request: created,
      });
    } catch (err) {
      console.error("[Housekeeping] Guest create error:", err);
      res.status(500).json({ error: "Failed to submit housekeeping request." });
    }
  });

  // Staff: Summary KPIs
  router.get(
    "/summary",
    requireStaff(["admin", "housekeeping", "housekeeping:view"]),
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.staff!.propertyId;
      try {
        const summaryRes = await db.query(
          `SELECT
            COUNT(*) FILTER (WHERE status = 'pending') AS "pendingCount",
            COUNT(*) FILTER (WHERE status = 'in_progress' OR status = 'accepted') AS "inProgressCount",
            COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE) AS "completedTodayCount",
            COUNT(*) FILTER (WHERE status IN ('pending', 'accepted', 'in_progress')) AS "activeCount"
           FROM housekeeping_requests
           WHERE property_id = $1`,
          [propertyId]
        );

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
      } catch (err) {
        console.error("[Housekeeping] Summary error:", err);
        res.status(500).json({ error: "Failed to load summary." });
      }
    }
  );

  // Staff: List requests with filters
  router.get(
    "/",
    requireStaff(["admin", "housekeeping", "housekeeping:view"]),
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.staff!.propertyId;
      const { status, room, requestType, limit = 100, offset = 0 } = req.query;

      const conditions: string[] = ["hr.property_id = $1"];
      const values: any[] = [propertyId];
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
        const listRes = await db.query(
          `SELECT hr.*
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
           LIMIT $${idx++} OFFSET $${idx++}`,
          [...values, Number(limit), Number(offset)]
        );

        res.json({ success: true, requests: listRes.rows });
      } catch (err) {
        console.error("[Housekeeping] Staff fetch error:", err);
        res.status(500).json({ error: "Failed to fetch housekeeping queue." });
      }
    }
  );

  // Staff: Update request status
  router.patch(
    "/:id/status",
    requireStaff(["admin", "housekeeping", "housekeeping:edit"]),
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.staff!.propertyId;
      const requestId = Number(req.params.id);
      const { status: nextStatus, staffNotes } = req.body;
      const staff = req.staff!;

      if (!nextStatus || !(VALID_HOUSEKEEPING_STATUSES as readonly string[]).includes(nextStatus)) {
        res.status(400).json({ error: `Status must be one of: ${VALID_HOUSEKEEPING_STATUSES.join(", ")}` });
        return;
      }

      try {
        const currentRes = await db.query(
          "SELECT * FROM housekeeping_requests WHERE id = $1 AND property_id = $2",
          [requestId, propertyId]
        );

        if (currentRes.rows.length === 0) {
          res.status(404).json({ error: "Request not found." });
          return;
        }

        const current = currentRes.rows[0];
        const prevStatus = current.status;
        if (!ALLOWED_HOUSEKEEPING_TRANSITIONS[prevStatus]?.includes(nextStatus)) {
          res.status(409).json({ error: `Cannot move a ${prevStatus} request to ${nextStatus}.` });
          return;
        }

        if (typeof staffNotes === "string" && staffNotes.length > 500) {
          res.status(400).json({ error: "Staff notes must be 500 characters or fewer." });
          return;
        }

        let timestampCol = "";
        if (nextStatus === "accepted") timestampCol = ", accepted_at = NOW()";
        else if (nextStatus === "in_progress") timestampCol = ", started_at = NOW()";
        else if (nextStatus === "completed") timestampCol = ", completed_at = NOW()";
        else if (nextStatus === "declined") timestampCol = ", declined_at = NOW()";

        const staffName = staff.fullName || staff.username;

        const updateRes = await db.query(
          `UPDATE housekeeping_requests
           SET status = $1,
               assigned_staff_id = $2,
               assigned_staff_name = $3,
               staff_notes = COALESCE($4, staff_notes)
               ${timestampCol}
           WHERE id = $5 AND property_id = $6
           RETURNING *`,
          [nextStatus, staff.id, staffName, staffNotes?.trim() || null, requestId, propertyId]
        );

        const updated = updateRes.rows[0];

        await db.query(
          `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
           VALUES ($1, $2, $3, 'HOUSEKEEPING_STATUS_UPDATE', 'housekeeping', $4, $5)`,
          [
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
          ]
        );

        broadcastHousekeepingStatusChanged(updated, prevStatus);

        res.json({ success: true, request: updated });
      } catch (err) {
        console.error("[Housekeeping] Status update error:", err);
        res.status(500).json({ error: "Failed to update status." });
      }
    }
  );

  return router;
}
