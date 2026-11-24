import { dbAdapter } from "./db/index.js";
import { verifyStaffToken } from "./auth/jwt.js";
import { hasPermission } from "./auth/permissions.js";
import { requireStaff, requirePermission } from "./auth/middleware.js";
import { requireActiveStay } from "./stay/middleware.js";
import { socketGateway } from "./realtime/socketGateway.js";
export function createCoreModuleDeps() {
    return {
        db: dbAdapter,
        auth: {
            requireStaff,
            requirePermission,
            requireActiveStay,
            verifyStaffToken,
            hasPermission,
        },
        realtime: socketGateway,
        config: {
            jwtSecret: process.env.JWT_SECRET,
        },
    };
}
