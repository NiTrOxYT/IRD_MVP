import { Request, Response, NextFunction } from "express";
import { verifyStaffToken } from "./jwt.js";
import { hasPermission } from "./permissions.js";
import { query } from "../db/index.js";
import type { RequireStaffOptions, StaffPayload } from "../module.js";

export type { RequireStaffOptions };

declare global {
  namespace Express {
    interface Request {
      staff?: StaffPayload & {
        fullName?: string;
        permissions?: string[];
      };
    }
  }
}

export function requireStaff(options?: RequireStaffOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawToken =
      req.cookies?.staff_session ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
      (req.headers["x-staff-token"] as string | undefined);

    if (!rawToken) {
      res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" });
      return;
    }

    const payload = verifyStaffToken(rawToken);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired session", code: "SESSION_EXPIRED" });
      return;
    }

    try {
      const userRes = await query(
        `SELECT u.id, u.property_id, u.username, u.full_name, u.role, u.role_id, u.is_active, u.token_version,
                r.permissions, r.slug AS role_slug, r.name AS role_name
         FROM staff_users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1`,
        [payload.id]
      );

      if (userRes.rows.length === 0) {
        res.status(401).json({ error: "Account no longer exists", code: "ACCOUNT_NOT_FOUND" });
        return;
      }

      const user = userRes.rows[0];

      if (!user.is_active) {
        res.status(403).json({ error: "Account has been disabled", code: "ACCOUNT_DISABLED" });
        return;
      }

      if (payload.tokenVersion !== undefined && user.token_version !== payload.tokenVersion) {
        res.status(401).json({
          error: "Session has been invalidated. Please log in again.",
          code: "SESSION_INVALIDATED",
        });
        return;
      }

      let userPermissions: string[] = [];
      if (Array.isArray(user.permissions)) {
        userPermissions = user.permissions;
      } else if (typeof user.permissions === "string") {
        try {
          userPermissions = JSON.parse(user.permissions);
        } catch {
          userPermissions = [];
        }
      }

      if (user.role === "admin" || user.role_slug === "admin") {
        if (!userPermissions.includes("*")) {
          userPermissions = ["*", ...userPermissions];
        }
      }

      req.staff = {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role_slug || user.role,
        roleId: user.role_id,
        propertyId: user.property_id,
        tokenVersion: user.token_version,
        permissions: userPermissions,
      };

      if (options) {
        let authorized = false;

        if (typeof options === "string") {
          authorized = hasPermission(userPermissions, options);
        } else if (Array.isArray(options)) {
          for (const opt of options) {
            if (
              user.role === opt ||
              user.role_slug === opt ||
              hasPermission(userPermissions, opt)
            ) {
              authorized = true;
              break;
            }
          }
        } else if (typeof options === "object") {
          if (options.roles && options.roles.some((r) => r === user.role || r === user.role_slug)) {
            authorized = true;
          } else if (options.permission && hasPermission(userPermissions, options.permission)) {
            authorized = true;
          } else if (options.permissions && options.permissions.some((p) => hasPermission(userPermissions, p))) {
            authorized = true;
          }
        }

        if (!authorized) {
          res.status(403).json({
            error: "Access denied. Insufficient permissions for this action.",
            code: "FORBIDDEN",
          });
          return;
        }
      }

      next();
    } catch (err) {
      console.error("[Auth Middleware] Validation error:", err);
      res.status(500).json({ error: "Authentication validation error" });
    }
  };
}

export function requirePermission(permission: string) {
  return requireStaff(permission);
}
