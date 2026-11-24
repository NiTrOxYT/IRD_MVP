import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attractionSchema } from "../modules/attractions/validation.js";

describe("Local Attractions Schema Validation", () => {
  it("accepts valid attraction with photos, videos, pricing, and 5-star rating", () => {
    const parsed = attractionSchema.safeParse({
      title: "Emerald Ridge Sunset Point",
      category: "Sunset & Nature",
      rating: 4.9,
      cabPrice: 1200,
      entryFee: 0,
      packagePrice: 2800,
      packageDetails: "Private SUV + Sunset Deck",
      media: [
        { type: "image", url: "https://example.com/cliff.jpg", caption: "Cliffside view" },
        { type: "video", url: "https://example.com/tour.mp4" },
      ],
      isFeatured: true,
      isActive: true,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects rating outside 0 to 5 star bounds", () => {
    assert.equal(
      attractionSchema.safeParse({ title: "Overrated Spot", rating: 5.5 }).success,
      false
    );
    assert.equal(
      attractionSchema.safeParse({ title: "Negative Spot", rating: -1 }).success,
      false
    );
  });
});
