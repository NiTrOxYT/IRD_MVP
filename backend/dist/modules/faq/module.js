import { Router } from "express";
import { createFaqRouter } from "./routes/faq.routes.js";
export * from "./validation.js";
export { createFaqRouter } from "./routes/faq.routes.js";
export const FAQ_PERMISSIONS = [
    {
        id: "faq",
        name: "Guest FAQ",
        description: "Manageable list of frequently asked guest questions and answers",
        actions: ["view", "create", "edit", "delete", "manage"],
    },
];
export function createFaqModule(deps) {
    const router = Router();
    const faqRouter = createFaqRouter(deps);
    router.use("/faq", faqRouter);
    return {
        id: "faq",
        name: "Guest FAQ",
        permissions: FAQ_PERMISSIONS,
        router,
        routes: {
            faq: faqRouter,
        },
        registerRealtime: () => { },
    };
}
