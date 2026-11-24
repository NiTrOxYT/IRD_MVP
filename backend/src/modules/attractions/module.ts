import { Router } from "express";
import type { AttractionsModuleDeps } from "./types.js";
import { createAttractionsRouter } from "./routes/attractions.routes.js";

export type { AttractionsModuleDeps } from "./types.js";
export * from "./validation.js";
export { createAttractionsRouter } from "./routes/attractions.routes.js";

export const ATTRACTIONS_PERMISSIONS = [
  {
    id: "attractions",
    name: "Local Attractions",
    description: "Nearby sightseeing spots, photos/videos, pricing packages, and 5-star ratings",
    actions: ["view", "create", "edit", "delete", "manage"] as const,
  },
];

export function createAttractionsModule(deps: AttractionsModuleDeps) {
  const router = Router();
  const attractionsRouter = createAttractionsRouter(deps);

  router.use("/attractions", attractionsRouter);

  return {
    id: "attractions",
    name: "Local Attractions",
    permissions: ATTRACTIONS_PERMISSIONS,
    router,
    routes: {
      attractions: attractionsRouter,
    },
    registerRealtime: () => {},
  };
}
