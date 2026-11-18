import { verifyStaffToken } from "../lib/auth.js";
export function requireStaff(allowedRoles) {
    return (req, res, next) => {
        const rawToken = req.cookies?.staff_session ||
            req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
            req.headers["x-staff-token"];
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
