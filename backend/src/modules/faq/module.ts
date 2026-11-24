import { Router } from "express";
import type { FaqModuleDeps } from "./types.js";
import { createFaqRouter } from "./routes/faq.routes.js";

export type { FaqModuleDeps } from "./types.js";
export * from "./validation.js";
export { createFaqRouter } from "./routes/faq.routes.js";

export const FAQ_PERMISSIONS = [
  {
    id: "faq",
    name: "Guest FAQ",
    description: "Manageable list of frequently asked guest questions and answers",
    actions: ["view", "create", "edit", "delete", "manage"] as const,
  },
];

export function createFaqModule(deps: FaqModuleDeps) {
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
    registerRealtime: () => {},
  };
}
