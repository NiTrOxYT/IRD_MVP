import { Router } from "express";
import { createAttractionsRouter } from "./routes/attractions.routes.js";
export * from "./validation.js";
export { createAttractionsRouter } from "./routes/attractions.routes.js";
export const ATTRACTIONS_PERMISSIONS = [
    {
        id: "attractions",
        name: "Local Attractions",
        description: "Nearby sightseeing spots, photos/videos, pricing packages, and 5-star ratings",
        actions: ["view", "create", "edit", "delete", "manage"],
    },
];
export function createAttractionsModule(deps) {
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
        registerRealtime: () => { },
    };
}
