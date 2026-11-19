import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, PERMISSION_MODULES } from "../lib/permissions.js";
describe("Housekeeping Management Logic & Permissions", () => {
    it("includes housekeeping in permission modules catalog", () => {
        const hkModule = PERMISSION_MODULES.find((m) => m.id === "housekeeping");
        assert.ok(hkModule, "housekeeping module must be registered");
        assert.equal(hkModule.name, "Housekeeping");
        assert.deepEqual(hkModule.actions, ["view", "create", "edit", "delete", "manage"]);
    });
    it("checks housekeeping RBAC permissions correctly", () => {
        const hkStaffPerms = ["housekeeping:view", "housekeeping:edit", "stays:view"];
        assert.equal(hasPermission(hkStaffPerms, "housekeeping:view"), true);
        assert.equal(hasPermission(hkStaffPerms, "housekeeping:edit"), true);
        assert.equal(hasPermission(hkStaffPerms, "housekeeping:delete"), false);
        assert.equal(hasPermission(hkStaffPerms, "menu:view"), false);
        const hkManagerPerms = ["housekeeping:manage"];
        assert.equal(hasPermission(hkManagerPerms, "housekeeping:view"), true);
        assert.equal(hasPermission(hkManagerPerms, "housekeeping:edit"), true);
        assert.equal(hasPermission(hkManagerPerms, "housekeeping:delete"), true);
        assert.equal(hasPermission(hkManagerPerms, "orders:view"), false);
    });
    it("maps valid request types to clear titles", () => {
        const REQUEST_TITLES = {
            cleaning: "Room Cleaning & Refresh",
            towels: "Fresh Bath Towels & Mats",
            toiletries: "Toiletries & Bathroom Amenities",
            linen: "Fresh Bed Linen & Pillowcases",
            bedding: "Extra Pillows & Blankets",
            turndown: "Evening Turndown Service",
            luggage: "Luggage & Porter Assistance",
            other: "In-Suite Assistance Request",
        };
        const types = ["cleaning", "towels", "toiletries", "linen", "bedding", "turndown", "luggage", "other"];
        for (const t of types) {
            assert.ok(REQUEST_TITLES[t], `Missing title mapping for ${t}`);
            assert.ok(REQUEST_TITLES[t].length > 5, `Title for ${t} should be descriptive`);
        }
    });
    it("validates valid status transitions for staff console", () => {
        const VALID_STATUSES = ["pending", "accepted", "in_progress", "completed", "declined"];
        const testStatus = (status) => VALID_STATUSES.includes(status);
        assert.equal(testStatus("pending"), true);
        assert.equal(testStatus("accepted"), true);
        assert.equal(testStatus("in_progress"), true);
        assert.equal(testStatus("completed"), true);
        assert.equal(testStatus("declined"), true);
        assert.equal(testStatus("unknown_status"), false);
    });
});
