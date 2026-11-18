import { Request, Response, NextFunction } from "express";
import { verifyStaffToken, StaffSessionPayload } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      staff?: StaffSessionPayload;
    }
  }
}

export function requireStaff(allowedRoles?: Array<"admin" | "staff" | "kitchen">) {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]`,
        code: "FORBIDDEN",
      });
      return;
    }

    req.staff = payload;
    next();
  };
}
