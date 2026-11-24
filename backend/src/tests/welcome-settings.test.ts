import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { settingsSchema } from "../core/validation.js";

describe("Welcome Letter Settings Validation", () => {
  it("accepts valid welcomeMode, welcomeMessage, and welcomeBgUrl values", () => {
    for (const mode of ["every_time", "once_per_stay", "disabled"] as const) {
      const parsed = settingsSchema.safeParse({
        welcomeMode: mode,
        welcomeMessage: "We are thrilled to host you in our coastal suites.",
        welcomeBgUrl: "data:image/webp;base64,UklGRh4AAABXRUJQVlA4",
      });
      assert.equal(parsed.success, true);
    }
  });

  it("rejects unsupported welcomeMode values", () => {
    const parsed = settingsSchema.safeParse({
      welcomeMode: "always_popup",
    });
    assert.equal(parsed.success, false);
  });
});
