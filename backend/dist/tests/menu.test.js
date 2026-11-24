import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { menuItemSchema, reorderCategoriesSchema, createOrderSchema, } from "../modules/ird/validation.js";
describe("Menu Variants & Categories Validation", () => {
    it("validates menu items with portion sizes / variants", () => {
        const validWithVariants = menuItemSchema.safeParse({
            name: "Truffle Tagliolini",
            categoryId: 1,
            price: 450,
            prepTimeMinutes: 20,
            variants: [
                { name: "Half Portion", price: 450, available: true, sortOrder: 1 },
                { name: "Full Portion", price: 750, available: true, sortOrder: 2 },
            ],
        });
        assert.equal(validWithVariants.success, true);
        if (validWithVariants.success) {
            assert.equal(validWithVariants.data.variants?.length, 2);
            assert.equal(validWithVariants.data.variants[0].name, "Half Portion");
            assert.equal(validWithVariants.data.variants[1].price, 750);
        }
    });
    it("rejects negative variant prices or missing variant names", () => {
        const invalidVariant = menuItemSchema.safeParse({
            name: "Cold Brew",
            categoryId: 2,
            price: 200,
            variants: [{ name: "", price: -50 }],
        });
        assert.equal(invalidVariant.success, false);
    });
    it("validates category reordering array schema", () => {
        const validReorder = reorderCategoriesSchema.safeParse({
            orders: [
                { id: 2, sortOrder: 1 },
                { id: 1, sortOrder: 2 },
                { id: 3, sortOrder: 3 },
            ],
        });
        assert.equal(validReorder.success, true);
    });
    it("validates order item placement with variantId", () => {
        const orderWithVariant = createOrderSchema.safeParse({
            items: [
                {
                    menuItemId: 1,
                    variantId: 2,
                    quantity: 2,
                    modifierIds: [1],
                    notes: "Extra truffle oil please",
                },
            ],
            specialInstructions: "Leave outside suite door",
        });
        assert.equal(orderWithVariant.success, true);
        if (orderWithVariant.success) {
            assert.equal(orderWithVariant.data.items[0].variantId, 2);
            assert.equal(orderWithVariant.data.items[0].quantity, 2);
        }
    });
});
