import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { faqSchema } from "../modules/faq/validation.js";
import { createFaqModule } from "../modules/faq/module.js";

describe("FAQ Schema & Module Isolation", () => {
  it("validates valid FAQ payload", () => {
    const parsed = faqSchema.safeParse({
      question: "What time is breakfast served?",
      answer: "Breakfast is available in-suite from 6:30 AM to 11:00 AM.",
      category: "Dining",
      sortOrder: 1,
      isActive: true,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects empty question or answer", () => {
    assert.equal(faqSchema.safeParse({ question: "Hi", answer: "Valid" }).success, false);
    assert.equal(faqSchema.safeParse({ question: "Valid question?", answer: "" }).success, false);
  });

  it("mounts FAQ module cleanly with injected deps", () => {
    const passThrough = (_req: Request, _res: Response, next: NextFunction) => next();
    const faqModule = createFaqModule({
      db: {
        query: async () => ({ rows: [], rowCount: 0 }),
        connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => {} }),
      },
      auth: {
        requireStaff: () => passThrough,
        requireActiveStay: passThrough,
      },
    });
    assert.equal(faqModule.id, "faq");
    assert.ok(faqModule.permissions.some((p) => p.id === "faq"));
    const app = express();
    app.use("/api", faqModule.router);
    assert.ok(app);
  });
});
