import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createInboxModule, createInboxMessageSchema } from "../modules/inbox/module.js";
describe("Guest Inbox Schema & Module Isolation", () => {
    it("accepts resort-wide broadcast and strips targetRoomIds when targetType is all", () => {
        const parsed = createInboxMessageSchema.parse({
            title: "Sunset Poolside Jazz",
            body: "Join us at the Infinity Terrace from 6:30 PM for live acoustic jazz and welcome mocktails.",
            category: "Event",
            targetType: "all",
            targetRoomIds: [1, 2],
        });
        assert.equal(parsed.targetType, "all");
        assert.deepEqual(parsed.targetRoomIds, []);
    });
    it("deduplicates targetRoomIds when targeting specific rooms", () => {
        const parsed = createInboxMessageSchema.parse({
            title: "Luggage Concierge Ready",
            body: "Your afternoon transfer vehicle awaits at the main porte-cochere.",
            category: "Concierge",
            targetType: "rooms",
            targetRoomIds: [3, 5, 3],
        });
        assert.equal(parsed.targetType, "rooms");
        assert.deepEqual(parsed.targetRoomIds, [3, 5]);
    });
    it("rejects room-targeted notification when no rooms are selected", () => {
        const result = createInboxMessageSchema.safeParse({
            title: "Private Note",
            body: "Please contact reception at your convenience.",
            category: "Notice",
            targetType: "rooms",
            targetRoomIds: [],
        });
        assert.equal(result.success, false);
    });
    it("mounts Inbox module cleanly with injected deps", () => {
        const pass = (_req, _res, next) => next();
        const mod = createInboxModule({
            db: {
                query: async () => ({ rows: [], rowCount: 0 }),
                connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => { } }),
            },
            auth: { requireStaff: () => pass, requireActiveStay: pass },
            realtime: { emitToRoom: () => { } },
        });
        assert.equal(mod.id, "inbox");
        assert.ok(mod.permissions.some((p) => p.id === "inbox"));
        const app = express();
        app.use("/api", mod.router);
        assert.ok(app);
    });
});
