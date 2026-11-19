import { Router } from "express";
import { query } from "../db/index.js";
import { comparePassword, signStaffToken } from "../lib/auth.js";
import { requireStaff } from "../middleware/auth.js";
const router = Router();
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
    }
    try {
        const result = await query(`SELECT u.id, u.property_id, u.username, u.password_hash, u.full_name, u.role, u.role_id, u.is_active, u.token_version,
              r.slug AS role_slug, r.name AS role_name, r.permissions
       FROM staff_users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE LOWER(u.username) = $1`, [username.trim().toLowerCase()]);
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
        let userPermissions = [];
        if (Array.isArray(user.permissions)) {
            userPermissions = user.permissions;
        }
        else if (typeof user.permissions === "string") {
            try {
                userPermissions = JSON.parse(user.permissions);
            }
            catch {
                userPermissions = [];
            }
        }
        if (user.role === "admin" || user.role_slug === "admin") {
            if (!userPermissions.includes("*")) {
                userPermissions = ["*", ...userPermissions];
            }
        }
        const token = signStaffToken({
            id: user.id,
            username: user.username,
            role: user.role_slug || user.role,
            roleId: user.role_id,
            propertyId: user.property_id,
            tokenVersion: user.token_version,
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
                role: user.role_slug || user.role,
                roleName: user.role_name || user.role,
                roleId: user.role_id,
                propertyId: user.property_id,
                permissions: userPermissions,
            },
        });
    }
    catch (err) {
        console.error("[Auth] Login error:", err);
        res.status(500).json({ error: "Internal authentication error" });
    }
});
router.post("/logout", (_req, res) => {
    res.clearCookie("staff_session");
    res.json({ success: true, message: "Logged out successfully" });
});
router.get("/me", requireStaff(), async (req, res) => {
    res.json({ user: req.staff });
});
export default router;
