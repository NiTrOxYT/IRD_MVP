import { Router } from "express";
import type { RoomServiceModuleDeps } from "./types.js";
import { registerRoomServiceRealtime } from "./realtime.js";
import { createHousekeepingRouter } from "./routes/housekeeping.routes.js";

export type { RoomServiceModuleDeps } from "./types.js";
export { REQUEST_TITLES, VALID_HOUSEKEEPING_STATUSES, ALLOWED_HOUSEKEEPING_TRANSITIONS } from "./catalog.js";
export { createHousekeepingRouter } from "./routes/housekeeping.routes.js";
export { registerRoomServiceRealtime, createRoomServiceBroadcasters } from "./realtime.js";

export const ROOM_SERVICE_PERMISSIONS = [
  {
    id: "housekeeping",
    name: "Housekeeping",
    description: "Guest room cleaning, fresh linens, toiletries, and amenities requests",
    actions: ["view", "create", "edit", "delete", "manage"] as const,
  },
];

export function createRoomServiceModule(deps: RoomServiceModuleDeps) {
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
