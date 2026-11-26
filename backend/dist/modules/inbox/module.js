import { Router } from "express";
import { createInboxRouter } from "./routes/inbox.routes.js";
export * from "./validation.js";
export { createInboxRouter } from "./routes/inbox.routes.js";
export const INBOX_PERMISSIONS = [
    {
        id: "inbox",
        name: "Guest Inbox & Notifications",
        description: "Push targeted room notifications and resort-wide guest inbox announcements",
        actions: ["view", "create", "edit", "delete", "manage"],
    },
];
export function createInboxModule(deps) {
    const router = Router();
    const inboxRouter = createInboxRouter(deps);
    router.use("/inbox", inboxRouter);
    return {
        id: "inbox",
        name: "Guest Inbox",
        permissions: INBOX_PERMISSIONS,
        router,
        routes: {
            inbox: inboxRouter,
        },
        registerRealtime: () => { },
    };
}
