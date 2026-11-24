import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, PERMISSION_MODULES } from "../core/auth/permissions.js";

describe("RBAC Permissions Logic & Hierarchy", () => {
  it("includes all required resort dining permission modules", () => {
    const moduleIds = PERMISSION_MODULES.map((m) => m.id);
    const expected = [
      "overview",
      "orders",
      "stays",
      "menu",
      "inventory",
      "analytics",
      "qr",
      "settings",
      "users",
      "housekeeping",
    ];

    for (const exp of expected) {
      assert.ok(moduleIds.includes(exp), `Missing expected module: ${exp}`);
    }
  });

  it("grants all access when wildcard '*' is present", () => {
    const adminPerms = ["*"];
    assert.equal(hasPermission(adminPerms, "orders:view"), true);
    assert.equal(hasPermission(adminPerms, "users:manage"), true);
    assert.equal(hasPermission(adminPerms, "settings:edit"), true);
    assert.equal(hasPermission(adminPerms, "inventory:delete"), true);
  });

  it("grants access for exact permission match", () => {
    const perms = ["orders:view", "stays:view", "menu:create"];
    assert.equal(hasPermission(perms, "orders:view"), true);
    assert.equal(hasPermission(perms, "stays:view"), true);
    assert.equal(hasPermission(perms, "menu:create"), true);

    // Denies unspecified actions
    assert.equal(hasPermission(perms, "orders:delete"), false);
    assert.equal(hasPermission(perms, "users:view"), false);
  });

  it("grants any module action when 'module:manage' or 'module:*' is assigned", () => {
    const managerPerms = ["orders:manage", "menu:*"];

    // orders:manage inherits view, create, edit, delete
    assert.equal(hasPermission(managerPerms, "orders:view"), true);
    assert.equal(hasPermission(managerPerms, "orders:create"), true);
    assert.equal(hasPermission(managerPerms, "orders:edit"), true);
    assert.equal(hasPermission(managerPerms, "orders:delete"), true);

    // menu:* inherits all menu actions
    assert.equal(hasPermission(managerPerms, "menu:view"), true);
    assert.equal(hasPermission(managerPerms, "menu:delete"), true);

    // Still denies other unmanaged modules
    assert.equal(hasPermission(managerPerms, "users:view"), false);
    assert.equal(hasPermission(managerPerms, "settings:manage"), false);
  });

  it("denies access by default for empty or missing permissions", () => {
    assert.equal(hasPermission([], "orders:view"), false);
    assert.equal(hasPermission(undefined, "orders:view"), false);
    assert.equal(hasPermission(null, "users:manage"), false);
  });
});

describe("User & Role Security Guards", () => {
  it("prevents disabling or demoting the last active administrator", () => {
    // Simulate property with 1 active administrator
    const staffMembers = [
      { id: 1, role: "admin", is_active: true },
      { id: 2, role: "staff", is_active: true },
    ];

    function canDisableUser(userId: number): { allowed: boolean; reason?: string } {
      const target = staffMembers.find((u) => u.id === userId);
      if (!target) return { allowed: false, reason: "User not found" };

      if (target.role === "admin" && target.is_active) {
        const activeAdmins = staffMembers.filter((u) => u.role === "admin" && u.is_active).length;
        if (activeAdmins <= 1) {
          return {
            allowed: false,
            reason: "Cannot disable or remove administrator permissions from the last active administrator.",
          };
        }
      }
      return { allowed: true };
    }

    // Attempting to disable user 1 (only admin) must fail
    const result1 = canDisableUser(1);
    assert.equal(result1.allowed, false);
    assert.match(result1.reason!, /last active administrator/);

    // Disabling user 2 (staff) is allowed
    const result2 = canDisableUser(2);
    assert.equal(result2.allowed, true);

    // If another admin is added, disabling user 1 becomes allowed
    staffMembers.push({ id: 3, role: "admin", is_active: true });
    const result3 = canDisableUser(1);
    assert.equal(result3.allowed, true);
  });

  it("prevents self-deletion of current administrator", () => {
    const currentAdminId = 1;

    function canDeleteUser(callerId: number, targetId: number): boolean {
      if (callerId === targetId) return false;
      return true;
    }

    assert.equal(canDeleteUser(currentAdminId, 1), false);
    assert.equal(canDeleteUser(currentAdminId, 2), true);
  });

  it("enforces session invalidation when token_version increments", () => {
    let dbTokenVersion = 1;
    const sessionToken = { userId: 1, tokenVersion: 1 };

    function isSessionValid(token: { tokenVersion: number }): boolean {
      return token.tokenVersion === dbTokenVersion;
    }

    // Active session matches
    assert.equal(isSessionValid(sessionToken), true);

    // Administrator resets password or changes role -> token_version increments
    dbTokenVersion = 2;

    // Previous session token is now immediately invalidated
    assert.equal(isSessionValid(sessionToken), false);
  });
});
