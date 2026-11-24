import { Router, Request, Response } from "express";
import { query, pool } from "../db/index.js";
import { requirePermission } from "../auth/middleware.js";
import { hashPassword } from "../auth/jwt.js";
import { getRegisteredPermissionModules, hasPermission } from "../auth/permissions.js";

const router = Router();

// Helper: Check if a staff user is an active administrator
async function isActiveAdministrator(userId: number, propertyId: number): Promise<boolean> {
  const res = await query(
    `SELECT u.id, u.role, u.is_active, r.slug AS role_slug, r.permissions
     FROM staff_users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1 AND u.property_id = $2`,
    [userId, propertyId]
  );
  if (res.rows.length === 0) return false;
  const user = res.rows[0];
  if (!user.is_active) return false;

  let perms: string[] = [];
  if (Array.isArray(user.permissions)) perms = user.permissions;
  else if (typeof user.permissions === "string") {
    try {
      perms = JSON.parse(user.permissions);
    } catch {
      perms = [];
    }
  }

  return (
    user.role === "admin" ||
    user.role_slug === "admin" ||
    perms.includes("*") ||
    perms.includes("users:manage")
  );
}

// Helper: Count total active administrators for a property
async function countActiveAdministrators(propertyId: number): Promise<number> {
  const res = await query(
    `SELECT u.id, u.role, r.slug AS role_slug, r.permissions
     FROM staff_users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.property_id = $1 AND u.is_active = TRUE`,
    [propertyId]
  );

  let count = 0;
  for (const user of res.rows) {
    let perms: string[] = [];
    if (Array.isArray(user.permissions)) perms = user.permissions;
    else if (typeof user.permissions === "string") {
      try {
        perms = JSON.parse(user.permissions);
      } catch {
        perms = [];
      }
    }
    if (
      user.role === "admin" ||
      user.role_slug === "admin" ||
      perms.includes("*") ||
      perms.includes("users:manage")
    ) {
      count++;
    }
  }
  return count;
}

// ── 1. Permissions Catalog ──
router.get(
  "/permissions-catalog",
  requirePermission("users:view"),
  (_req: Request, res: Response): void => {
    res.json({ success: true, modules: getRegisteredPermissionModules() });
  }
);

// ── 2. Roles Management ──

// List roles for the property with user count
router.get(
  "/roles",
  requirePermission("users:view"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    try {
      const result = await query(
        `SELECT r.id, r.property_id, r.name, r.slug, r.description, r.is_builtin,
                r.permissions, r.created_at, r.updated_at,
                COUNT(u.id)::int AS user_count
         FROM roles r
         LEFT JOIN staff_users u ON r.id = u.role_id
         WHERE r.property_id = $1
         GROUP BY r.id
         ORDER BY r.is_builtin DESC, r.name ASC`,
        [propertyId]
      );

      res.json({ success: true, roles: result.rows });
    } catch (err) {
      console.error("[Users] List roles error:", err);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  }
);

// Create custom role
router.post(
  "/roles",
  requirePermission("users:manage"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const { name, description, permissions } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Role name is required" });
      return;
    }

    const trimmedName = name.trim();
    const slug =
      req.body.slug && typeof req.body.slug === "string"
        ? req.body.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
        : trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    if (!slug) {
      res.status(400).json({ error: "Invalid role slug" });
      return;
    }

    const validPermissions = Array.isArray(permissions)
      ? permissions.filter((p) => typeof p === "string" && p.trim().length > 0)
      : [];

    try {
      const existing = await query(
        "SELECT id FROM roles WHERE property_id = $1 AND slug = $2",
        [propertyId, slug]
      );
      if (existing.rows.length > 0) {
        res.status(400).json({ error: `A role with slug '${slug}' already exists` });
        return;
      }

      const insertRes = await query(
        `INSERT INTO roles (property_id, name, slug, description, is_builtin, permissions)
         VALUES ($1, $2, $3, $4, FALSE, $5::jsonb)
         RETURNING *`,
        [propertyId, trimmedName, slug, description?.trim() || null, JSON.stringify(validPermissions)]
      );

      const createdRole = insertRes.rows[0];

      // Audit Log
      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'ROLE_CREATED', 'role', $4, $5)`,
        [
          propertyId,
          req.staff!.id,
          req.staff!.username,
          String(createdRole.id),
          JSON.stringify({ name: trimmedName, slug, permissions: validPermissions }),
        ]
      );

      res.status(201).json({ success: true, role: createdRole });
    } catch (err) {
      console.error("[Users] Create role error:", err);
      res.status(500).json({ error: "Failed to create role" });
    }
  }
);

// Edit custom role or update permissions
router.put(
  "/roles/:id",
  requirePermission("users:manage"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const roleId = Number(req.params.id);
    const { name, description, permissions } = req.body;

    try {
      const roleRes = await query(
        "SELECT id, property_id, name, slug, is_builtin, permissions FROM roles WHERE id = $1 AND property_id = $2",
        [roleId, propertyId]
      );

      if (roleRes.rows.length === 0) {
        res.status(404).json({ error: "Role not found" });
        return;
      }

      const role = roleRes.rows[0];
      const validPermissions = Array.isArray(permissions)
        ? permissions.filter((p) => typeof p === "string" && p.trim().length > 0)
        : role.permissions;

      // Safety check: Prevent removing administrative capability from the built-in administrator role
      if (role.is_builtin && role.slug === "admin") {
        if (!validPermissions.includes("*") && !validPermissions.includes("users:manage")) {
          res.status(400).json({
            error: "Cannot remove core user management permissions from the built-in Administrator role.",
          });
          return;
        }
      }

      const targetName = role.is_builtin ? role.name : name?.trim() || role.name;

      const updateRes = await query(
        `UPDATE roles
         SET name = $1,
             description = $2,
             permissions = $3::jsonb,
             updated_at = NOW()
         WHERE id = $4 AND property_id = $5
         RETURNING *`,
        [
          targetName,
          description !== undefined ? description?.trim() || null : role.description,
          JSON.stringify(validPermissions),
          roleId,
          propertyId,
        ]
      );

      // Invalidate active sessions of users assigned to this role so changes take immediate effect
      await query(
        "UPDATE staff_users SET token_version = token_version + 1 WHERE role_id = $1",
        [roleId]
      );

      // Audit Log
      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'ROLE_UPDATED', 'role', $4, $5)`,
        [
          propertyId,
          req.staff!.id,
          req.staff!.username,
          String(roleId),
          JSON.stringify({ name: targetName, permissions: validPermissions }),
        ]
      );

      res.json({ success: true, role: updateRes.rows[0] });
    } catch (err) {
      console.error("[Users] Update role error:", err);
      res.status(500).json({ error: "Failed to update role" });
    }
  }
);

// Delete custom role
router.delete(
  "/roles/:id",
  requirePermission("users:manage"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const roleId = Number(req.params.id);

    try {
      const roleRes = await query(
        "SELECT id, name, slug, is_builtin FROM roles WHERE id = $1 AND property_id = $2",
        [roleId, propertyId]
      );

      if (roleRes.rows.length === 0) {
        res.status(404).json({ error: "Role not found" });
        return;
      }

      const role = roleRes.rows[0];

      if (role.is_builtin) {
        res.status(400).json({ error: "Built-in system roles cannot be deleted." });
        return;
      }

      // Check if users are currently assigned
      const usersRes = await query(
        "SELECT COUNT(*)::int AS count FROM staff_users WHERE role_id = $1",
        [roleId]
      );
      if (usersRes.rows[0].count > 0) {
        res.status(400).json({
          error: `Cannot delete role '${role.name}' because ${usersRes.rows[0].count} staff member(s) are currently assigned to it. Please reassign them first.`,
        });
        return;
      }

      await query("DELETE FROM roles WHERE id = $1 AND property_id = $2", [roleId, propertyId]);

      // Audit Log
      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'ROLE_DELETED', 'role', $4, $5)`,
        [propertyId, req.staff!.id, req.staff!.username, String(roleId), JSON.stringify({ name: role.name, slug: role.slug })]
      );

      res.json({ success: true, message: `Role '${role.name}' deleted successfully` });
    } catch (err) {
      console.error("[Users] Delete role error:", err);
      res.status(500).json({ error: "Failed to delete role" });
    }
  }
);

// ── 3. Staff Users Management ──

// List users with search, role filter, and status filter
router.get(
  "/",
  requirePermission("users:view"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const { search, roleId, status } = req.query;

    const conditions: string[] = ["u.property_id = $1"];
    const values: any[] = [propertyId];
    let idx = 2;

    if (search && String(search).trim()) {
      conditions.push(`(u.username ILIKE $${idx} OR u.full_name ILIKE $${idx})`);
      values.push(`%${String(search).trim()}%`);
      idx++;
    }

    if (roleId && roleId !== "all") {
      conditions.push(`u.role_id = $${idx++}`);
      values.push(Number(roleId));
    }

    if (status === "active") {
      conditions.push("u.is_active = TRUE");
    } else if (status === "disabled") {
      conditions.push("u.is_active = FALSE");
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    try {
      const result = await query(
        `SELECT u.id, u.property_id, u.username, u.full_name, u.role, u.role_id,
                u.is_active, u.created_at,
                r.name AS role_name, r.slug AS role_slug, r.permissions
         FROM staff_users u
         LEFT JOIN roles r ON u.role_id = r.id
         ${whereClause}
         ORDER BY u.id ASC`,
        values
      );

      res.json({
        success: true,
        users: result.rows.map((row: any) => ({
          ...row,
          permissions: Array.isArray(row.permissions)
            ? row.permissions
            : typeof row.permissions === "string"
            ? JSON.parse(row.permissions)
            : [],
        })),
      });
    } catch (err) {
      console.error("[Users] List users error:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

// Create new staff user
router.post(
  "/",
  requirePermission("users:create"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const { username, password, fullName, roleId } = req.body;

    if (!username || !username.trim() || username.trim().length < 3) {
      res.status(400).json({ error: "Username must be at least 3 characters long" });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters long" });
      return;
    }

    if (!fullName || !fullName.trim()) {
      res.status(400).json({ error: "Full name is required" });
      return;
    }

    if (!roleId) {
      res.status(400).json({ error: "Role assignment is required" });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    try {
      // Check username uniqueness
      const existing = await query("SELECT id FROM staff_users WHERE LOWER(username) = $1", [
        cleanUsername,
      ]);
      if (existing.rows.length > 0) {
        res.status(400).json({ error: `Username '${cleanUsername}' is already taken` });
        return;
      }

      // Verify role belongs to property
      const roleRes = await query("SELECT id, slug, name FROM roles WHERE id = $1 AND property_id = $2", [
        roleId,
        propertyId,
      ]);
      if (roleRes.rows.length === 0) {
        res.status(400).json({ error: "Selected role not found" });
        return;
      }

      const role = roleRes.rows[0];
      const passwordHash = hashPassword(password);

      const insertRes = await query(
        `INSERT INTO staff_users (property_id, username, password_hash, full_name, role, role_id, is_active, token_version)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, 1)
         RETURNING id, property_id, username, full_name, role, role_id, is_active, created_at`,
        [propertyId, cleanUsername, passwordHash, fullName.trim(), role.slug, role.id]
      );

      const createdUser = insertRes.rows[0];

      // Audit Log (NO PASSWORD)
      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'USER_CREATED', 'user', $4, $5)`,
        [
          propertyId,
          req.staff!.id,
          req.staff!.username,
          String(createdUser.id),
          JSON.stringify({ username: cleanUsername, fullName: fullName.trim(), role: role.name }),
        ]
      );

      res.status(201).json({
        success: true,
        user: {
          ...createdUser,
          role_name: role.name,
          role_slug: role.slug,
        },
      });
    } catch (err) {
      console.error("[Users] Create user error:", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

// Edit user (fullName, roleId, isActive)
router.put(
  "/:id",
  requirePermission("users:edit"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const targetUserId = Number(req.params.id);
    const { fullName, roleId, isActive } = req.body;

    try {
      const targetRes = await query(
        "SELECT id, property_id, username, full_name, role_id, is_active FROM staff_users WHERE id = $1 AND property_id = $2",
        [targetUserId, propertyId]
      );

      if (targetRes.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const target = targetRes.rows[0];

      // Safety check: Prevent disabling or removing administrator role from the last active admin
      const isTargetAdmin = await isActiveAdministrator(targetUserId, propertyId);
      if (isTargetAdmin) {
        let isLosingAdminStatus = false;

        if (isActive === false) {
          isLosingAdminStatus = true;
        }

        if (roleId && Number(roleId) !== target.role_id) {
          const newRoleRes = await query(
            "SELECT permissions, slug FROM roles WHERE id = $1 AND property_id = $2",
            [roleId, propertyId]
          );
          if (newRoleRes.rows.length > 0) {
            const newRole = newRoleRes.rows[0];
            const perms = Array.isArray(newRole.permissions) ? newRole.permissions : [];
            const retainsAdmin = newRole.slug === "admin" || perms.includes("*") || perms.includes("users:manage");
            if (!retainsAdmin) {
              isLosingAdminStatus = true;
            }
          }
        }

        if (isLosingAdminStatus) {
          const adminCount = await countActiveAdministrators(propertyId);
          if (adminCount <= 1) {
            res.status(400).json({
              error: "Cannot disable or remove administrator permissions from the last active administrator.",
            });
            return;
          }
        }
      }

      // Verify new role if provided
      let targetRoleSlug = undefined;
      if (roleId) {
        const roleRes = await query("SELECT slug FROM roles WHERE id = $1 AND property_id = $2", [
          roleId,
          propertyId,
        ]);
        if (roleRes.rows.length === 0) {
          res.status(400).json({ error: "Role not found" });
          return;
        }
        targetRoleSlug = roleRes.rows[0].slug;
      }

      const roleChanged = roleId && Number(roleId) !== target.role_id;
      const statusChanged = isActive !== undefined && Boolean(isActive) !== target.is_active;

      const updateRes = await query(
        `UPDATE staff_users
         SET full_name = COALESCE($1, full_name),
             role_id = COALESCE($2, role_id),
             role = COALESCE($3, role),
             is_active = COALESCE($4, is_active),
             token_version = CASE WHEN $5 = TRUE THEN token_version + 1 ELSE token_version END
         WHERE id = $6 AND property_id = $7
         RETURNING id, property_id, username, full_name, role, role_id, is_active, created_at`,
        [
          fullName?.trim() || null,
          roleId ? Number(roleId) : null,
          targetRoleSlug || null,
          isActive !== undefined ? Boolean(isActive) : null,
          roleChanged || statusChanged,
          targetUserId,
          propertyId,
        ]
      );

      // Audit Log
      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'USER_UPDATED', 'user', $4, $5)`,
        [
          propertyId,
          req.staff!.id,
          req.staff!.username,
          String(targetUserId),
          JSON.stringify({
            username: target.username,
            fullName: fullName || target.full_name,
            roleId: roleId || target.role_id,
            isActive: isActive !== undefined ? isActive : target.is_active,
          }),
        ]
      );

      res.json({ success: true, user: updateRes.rows[0] });
    } catch (err) {
      console.error("[Users] Update user error:", err);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// Reset user password
router.post(
  "/:id/reset-password",
  requirePermission("users:edit"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const targetUserId = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters long" });
      return;
    }

    try {
      const userRes = await query(
        "SELECT id, username FROM staff_users WHERE id = $1 AND property_id = $2",
        [targetUserId, propertyId]
      );

      if (userRes.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const user = userRes.rows[0];
      const newHash = hashPassword(newPassword);

      // Invalidate current sessions by bumping token_version
      await query(
        `UPDATE staff_users
         SET password_hash = $1,
             token_version = token_version + 1
         WHERE id = $2 AND property_id = $3`,
        [newHash, targetUserId, propertyId]
      );

      // Audit Log (NO PASSWORD)
      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'USER_PASSWORD_RESET', 'user', $4, $5)`,
        [
          propertyId,
          req.staff!.id,
          req.staff!.username,
          String(targetUserId),
          JSON.stringify({ username: user.username }),
        ]
      );

      res.json({ success: true, message: `Password reset successfully for ${user.username}` });
    } catch (err) {
      console.error("[Users] Reset password error:", err);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

// Toggle active status
router.patch(
  "/:id/status",
  requirePermission("users:edit"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const targetUserId = Number(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({ error: "isActive must be a boolean" });
      return;
    }

    try {
      const userRes = await query(
        "SELECT id, username, is_active FROM staff_users WHERE id = $1 AND property_id = $2",
        [targetUserId, propertyId]
      );

      if (userRes.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const user = userRes.rows[0];

      if (!isActive) {
        // Prevent disabling self
        if (targetUserId === req.staff!.id) {
          res.status(400).json({ error: "You cannot disable your own administrator account." });
          return;
        }

        // Prevent disabling last active administrator
        const isTargetAdmin = await isActiveAdministrator(targetUserId, propertyId);
        if (isTargetAdmin) {
          const count = await countActiveAdministrators(propertyId);
          if (count <= 1) {
            res.status(400).json({
              error: "Cannot disable the last active administrator for this property.",
            });
            return;
          }
        }
      }

      await query(
        `UPDATE staff_users
         SET is_active = $1,
             token_version = token_version + 1
         WHERE id = $2 AND property_id = $3`,
        [isActive, targetUserId, propertyId]
      );

      // Audit Log
      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'USER_STATUS_TOGGLED', 'user', $4, $5)`,
        [
          propertyId,
          req.staff!.id,
          req.staff!.username,
          String(targetUserId),
          JSON.stringify({ username: user.username, isActive }),
        ]
      );

      res.json({
        success: true,
        message: `Account ${user.username} has been ${isActive ? "enabled" : "disabled"}`,
        isActive,
      });
    } catch (err) {
      console.error("[Users] Toggle status error:", err);
      res.status(500).json({ error: "Failed to update account status" });
    }
  }
);

// Delete staff user
router.delete(
  "/:id",
  requirePermission("users:delete"),
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    const targetUserId = Number(req.params.id);

    try {
      if (targetUserId === req.staff!.id) {
        res.status(400).json({ error: "You cannot delete your own account." });
        return;
      }

      const userRes = await query(
        "SELECT id, username, full_name, is_active FROM staff_users WHERE id = $1 AND property_id = $2",
        [targetUserId, propertyId]
      );

      if (userRes.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const user = userRes.rows[0];

      // Safety check: Prevent deleting last active administrator
      const isTargetAdmin = await isActiveAdministrator(targetUserId, propertyId);
      if (isTargetAdmin) {
        const count = await countActiveAdministrators(propertyId);
        if (count <= 1) {
          res.status(400).json({
            error: "Cannot delete the last active administrator for this property.",
          });
          return;
        }
      }

      await query("DELETE FROM staff_users WHERE id = $1 AND property_id = $2", [
        targetUserId,
        propertyId,
      ]);

      // Audit Log
      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'USER_DELETED', 'user', $4, $5)`,
        [
          propertyId,
          req.staff!.id,
          req.staff!.username,
          String(targetUserId),
          JSON.stringify({ username: user.username, fullName: user.full_name }),
        ]
      );

      res.json({ success: true, message: `User '${user.username}' deleted successfully` });
    } catch (err) {
      console.error("[Users] Delete user error:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

export default router;
