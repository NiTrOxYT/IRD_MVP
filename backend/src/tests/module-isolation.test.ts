import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createIrdModule } from "../modules/ird/module.js";
import { createRoomServiceModule } from "../modules/room-service/module.js";
import { createAttractionsModule } from "../modules/attractions/module.js";
import { createSocketGateway } from "../core/realtime/socketGateway.js";

function createMockDeps() {
  const registeredRooms: string[] = [];
  const emittedEvents: Array<{ room: string; event: string; payload: unknown }> = [];
  const passThrough = (_req: Request, _res: Response, next: NextFunction) => next();

  return {
    registeredRooms,
    emittedEvents,
    deps: {
      db: {
        query: async () => ({ rows: [], rowCount: 0 }),
        connect: async () => ({
          query: async () => ({ rows: [], rowCount: 0 }),
          release: () => {},
        }),
      },
      auth: {
        requireStaff: () => passThrough,
        requireActiveStay: passThrough,
        verifyStaffToken: () => null,
        hasPermission: () => true,
      },
      realtime: {
        emitToRoom: (room: string, event: string, payload: unknown) => {
          emittedEvents.push({ room, event, payload });
        },
        registerRoomHandler: (event: string) => {
          registeredRooms.push(event);
        },
      },
      config: { jwtSecret: "isolated-test-secret" },
    },
  };
}

describe("Pluggable Backend Module Isolation", () => {
  it("creates and mounts IRD module independently with injected dependencies", () => {
    const { deps, registeredRooms } = createMockDeps();
    const ird = createIrdModule(deps);

    assert.equal(ird.id, "ird");
    assert.ok(ird.permissions.some((p) => p.id === "orders"));
    assert.ok(ird.permissions.some((p) => p.id === "menu"));
    assert.ok(ird.permissions.some((p) => p.id === "inventory"));
    assert.ok(ird.permissions.some((p) => p.id === "analytics"));

    ird.registerRealtime();
    assert.deepEqual(registeredRooms.sort(), ["join:admin", "join:kitchen", "join:order"]);

    const hostApp = express();
    hostApp.use("/custom-prefix", ird.router);
    assert.ok(hostApp);
  });

  it("creates and mounts Room Service module independently with injected dependencies", () => {
    const { deps, registeredRooms } = createMockDeps();
    const roomService = createRoomServiceModule(deps);

    assert.equal(roomService.id, "room-service");
    assert.ok(roomService.permissions.some((p) => p.id === "housekeeping"));

    roomService.registerRealtime();
    assert.deepEqual(registeredRooms, ["join:housekeeping"]);

    const hostApp = express();
    hostApp.use("/custom-prefix", roomService.router);
    assert.ok(hostApp);
  });

  it("creates and mounts Local Attractions module independently with injected dependencies", () => {
    const { deps } = createMockDeps();
    const attractions = createAttractionsModule(deps);

    assert.equal(attractions.id, "attractions");
    assert.ok(attractions.permissions.some((p) => p.id === "attractions"));

    const hostApp = express();
    hostApp.use("/custom-prefix", attractions.router);
    assert.ok(hostApp);
  });

  it("socket gateway supports registering custom module room handlers cleanly", () => {
    const gateway = createSocketGateway();
    let handled = false;
    gateway.registerRoomHandler("join:custom-module", () => {
      handled = true;
    });
    assert.equal(handled, false);
    assert.equal(gateway.getIO(), null);
  });
});
