import { Router, Request, Response } from "express";
import { query } from "../db/index.js";
import { requireStaff } from "../middleware/auth.js";

const router = Router();

router.get("/", requireStaff("settings:view"), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      "SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100"
    );
    res.json({ logs: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to load audit logs" });
  }
});

export default router;
