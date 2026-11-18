import { Router, Request, Response } from "express";
import { query } from "../db/index.js";
import { comparePassword, signStaffToken } from "../lib/auth.js";
import { requireStaff } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  try {
    const result = await query(
      "SELECT id, property_id, username, password_hash, full_name, role, is_active FROM staff_users WHERE username = $1",
      [username.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: "Account is disabled. Please contact the administrator." });
      return;
    }

    const match = comparePassword(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = signStaffToken({
      id: user.id,
      username: user.username,
      role: user.role,
      propertyId: user.property_id,
    });

    res.cookie("staff_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        propertyId: user.property_id,
      },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Internal authentication error" });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("staff_session");
  res.json({ success: true, message: "Logged out successfully" });
});

router.get("/me", requireStaff(), async (req: Request, res: Response): Promise<void> => {
  if (!req.staff) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  try {
    const result = await query(
      "SELECT id, property_id, username, full_name, role FROM staff_users WHERE id = $1",
      [req.staff.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
