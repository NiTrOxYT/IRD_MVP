import { Router } from "express";
import { query } from "../db/index.js";
import { requireStaff } from "../middleware/auth.js";
const router = Router();
router.get("/", requireStaff(["admin"]), async (_req, res) => {
    try {
        const result = await query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100");
        res.json({ logs: result.rows });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to load audit logs" });
    }
});
export default router;
