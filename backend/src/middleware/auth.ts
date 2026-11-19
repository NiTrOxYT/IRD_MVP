import { Request, Response, NextFunction } from "express";
import { verifyStaffToken, StaffSessionPayload } from "../lib/auth.js";
import { hasPermission } from "../lib/permissions.js";
import { query } from "../db/index.js";

declare global {
  namespace Express {
    interface Request {
      staff?: StaffSessionPayload & {
        fullName?: string;
        permissions?: string[];
      };
    }
  }
}

export type RequireStaffOptions =
  | string // Single permission string, e.g. "users:view"
  | string[] // Array of allowed role slugs or permissions
  | {
      permission?: string;
      permissions?: string[];
      roles?: string[];
    };

/**
 * Staff authentication and authorization middleware.
 * - Authenticates JWT token from cookie or header.
 * - Validates active status and session token version against the database.
 * - Enforces role and granular permission access.
 * - Denies access by default if permission is missing.
 */
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
      // Live validation from DB: verify user is still active and retrieve live permissions and token version
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

      // Check session token version if present in token
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

      // If user has built-in 'admin' role, grant full wildcard
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

      // Check authorization if options are provided
      if (options) {
        let authorized = false;

        // 1. Single string option -> treat as permission
        if (typeof options === "string") {
          authorized = hasPermission(userPermissions, options);
        } else if (Array.isArray(options)) {
          // Array of strings -> could be role slugs (e.g. ["admin", "staff", "kitchen"]) or permissions
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
