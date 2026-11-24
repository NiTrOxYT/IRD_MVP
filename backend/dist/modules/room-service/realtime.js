export function registerRoomServiceRealtime(deps) {
    const { db, auth, realtime } = deps;
    realtime.registerRoomHandler("join:housekeeping", async (socket, payload, helpers) => {
        const token = helpers.extractToken(socket) || (payload?.token ? String(payload.token) : "");
        if (token) {
            const verified = auth.verifyStaffToken(token);
            if (verified) {
                try {
                    const userRes = await db.query(`SELECT u.property_id, u.is_active, u.token_version, u.role,
                    r.slug AS role_slug, r.permissions
             FROM staff_users u
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE u.id = $1`, [verified.id]);
                    const user = userRes.rows[0];
                    let permissions = Array.isArray(user?.permissions) ? user.permissions : [];
                    if (typeof user?.permissions === "string") {
                        try {
                            permissions = JSON.parse(user.permissions);
                        }
                        catch {
                            permissions = [];
                        }
                    }
                    if (user?.role === "admin" || user?.role_slug === "admin") {
                        permissions = ["*", ...permissions];
                    }
                    const sessionIsCurrent = verified.tokenVersion === undefined || user?.token_version === verified.tokenVersion;
                    if (user?.is_active && sessionIsCurrent && auth.hasPermission(permissions, "housekeeping:view")) {
                        socket.join(`housekeeping:${user.property_id}`);
                        socket.emit("joined:housekeeping", { success: true });
                        return;
                    }
                }
                catch (error) {
                    console.error("[Socket] Housekeeping authorization failed:", error);
                }
            }
        }
        socket.emit("error", { message: "Unauthorized housekeeping session" });
    });
}
export function createRoomServiceBroadcasters(deps) {
    const { realtime } = deps;
    return {
        broadcastHousekeepingCreated(request) {
            realtime.emitToRoom(`housekeeping:${request.property_id || request.propertyId}`, "housekeeping:created", request);
            if (request.stay_id || request.stayId) {
                realtime.emitToRoom(`stay:${request.stay_id || request.stayId}`, "housekeeping:created", request);
            }
        },
        broadcastHousekeepingStatusChanged(request, previousStatus) {
            const payload = { request, previousStatus };
            realtime.emitToRoom(`housekeeping:${request.property_id || request.propertyId}`, "housekeeping:status_changed", payload);
            if (request.stay_id || request.stayId) {
                realtime.emitToRoom(`stay:${request.stay_id || request.stayId}`, "housekeeping:status_changed", payload);
            }
        },
    };
}
