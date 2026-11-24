import { Router } from "express";
import { registerRoomServiceRealtime } from "./realtime.js";
import { createHousekeepingRouter } from "./routes/housekeeping.routes.js";
export { REQUEST_TITLES, VALID_HOUSEKEEPING_STATUSES, ALLOWED_HOUSEKEEPING_TRANSITIONS } from "./catalog.js";
export { createHousekeepingRouter } from "./routes/housekeeping.routes.js";
export { registerRoomServiceRealtime, createRoomServiceBroadcasters } from "./realtime.js";
export const ROOM_SERVICE_PERMISSIONS = [
    {
        id: "housekeeping",
        name: "Housekeeping",
        description: "Guest room cleaning, fresh linens, toiletries, and amenities requests",
        actions: ["view", "create", "edit", "delete", "manage"],
    },
];
export function createRoomServiceModule(deps) {
    const router = Router();
    const housekeepingRouter = createHousekeepingRouter(deps);
    router.use("/housekeeping", housekeepingRouter);
    return {
        id: "room-service",
        name: "Room Service & Housekeeping",
        permissions: ROOM_SERVICE_PERMISSIONS,
        router,
        routes: {
            housekeeping: housekeepingRouter,
        },
        registerRealtime: () => registerRoomServiceRealtime(deps),
    };
}
