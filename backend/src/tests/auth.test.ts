import { test, describe } from "node:test";
import assert from "node:assert";
import { hashPassword, comparePassword, signStaffToken, verifyStaffToken } from "../lib/auth.js";

describe("Staff Authentication & Authorization", () => {
  test("hashes and verifies password correctly", () => {
    const password = "ResortPassword!2026";
    const hash = hashPassword(password);

    assert.notStrictEqual(hash, password);
    assert.strictEqual(comparePassword(password, hash), true);
    assert.strictEqual(comparePassword("WrongPassword", hash), false);
  });

  test("signs and verifies JWT staff token with role and property context", () => {
    const payload = {
      id: 42,
      username: "executive_chef",
      role: "kitchen" as const,
      propertyId: 1,
    };

    const token = signStaffToken(payload);
    assert.ok(typeof token === "string" && token.length > 20);

    const decoded = verifyStaffToken(token);
    assert.ok(decoded);
    assert.strictEqual(decoded.id, 42);
    assert.strictEqual(decoded.username, "executive_chef");
    assert.strictEqual(decoded.role, "kitchen");
    assert.strictEqual(decoded.propertyId, 1);
  });

  test("rejects tampered or malformed tokens", () => {
    const payload = {
      id: 1,
      username: "admin",
      role: "admin" as const,
      propertyId: 1,
    };
    const validToken = signStaffToken(payload);
    const tamperedToken = validToken.slice(0, -6) + "abcdef";

    assert.strictEqual(verifyStaffToken(tamperedToken), null);
    assert.strictEqual(verifyStaffToken("not-a-token"), null);
    assert.strictEqual(verifyStaffToken(""), null);
  });
});
