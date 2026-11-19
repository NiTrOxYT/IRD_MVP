import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeUnit, getUnitDimension, areUnitsCompatible, convertUnitQuantity, isValidUnit, } from "../lib/units.js";
describe("Inventory Units of Measurement & Dimensional Conversion", () => {
    it("normalizes and validates supported unit strings", () => {
        assert.equal(isValidUnit("kg"), true);
        assert.equal(isValidUnit("KILOGRAMS"), true);
        assert.equal(isValidUnit("litres"), true);
        assert.equal(isValidUnit("ml"), true);
        assert.equal(isValidUnit("portions"), true);
        assert.equal(isValidUnit("pcs"), true);
        assert.equal(isValidUnit("invalid_unit_xyz"), false);
        assert.equal(normalizeUnit("  Grams "), "g");
        assert.equal(normalizeUnit("LITRE"), "litres");
        assert.equal(normalizeUnit("pcs"), "pieces");
    });
    it("identifies correct physical unit dimensions", () => {
        assert.equal(getUnitDimension("kg"), "mass");
        assert.equal(getUnitDimension("g"), "mass");
        assert.equal(getUnitDimension("litres"), "volume");
        assert.equal(getUnitDimension("ml"), "volume");
        assert.equal(getUnitDimension("portions"), "discrete");
        assert.equal(getUnitDimension("pieces"), "discrete");
    });
    it("enforces dimensional compatibility between units", () => {
        // Compatible mass
        assert.equal(areUnitsCompatible("kg", "g"), true);
        assert.equal(areUnitsCompatible("g", "kg"), true);
        // Compatible volume
        assert.equal(areUnitsCompatible("litres", "ml"), true);
        assert.equal(areUnitsCompatible("ml", "litres"), true);
        // Incompatible cross-dimension
        assert.equal(areUnitsCompatible("kg", "litres"), false);
        assert.equal(areUnitsCompatible("g", "ml"), false);
        assert.equal(areUnitsCompatible("portions", "kg"), false);
        assert.equal(areUnitsCompatible("pieces", "litres"), false);
        // Discrete units must match each other exactly
        assert.equal(areUnitsCompatible("portions", "portions"), true);
        assert.equal(areUnitsCompatible("pieces", "pieces"), true);
        assert.equal(areUnitsCompatible("portions", "pieces"), false);
    });
    it("converts quantities accurately between metric mass and volume units", () => {
        // 250 grams to kg -> 0.25 kg
        assert.equal(convertUnitQuantity(250, "g", "kg"), 0.25);
        // 1.5 kg to grams -> 1500 g
        assert.equal(convertUnitQuantity(1.5, "kg", "g"), 1500);
        // 750 ml to litres -> 0.75 litres
        assert.equal(convertUnitQuantity(750, "ml", "litres"), 0.75);
        // 2 litres to ml -> 2000 ml
        assert.equal(convertUnitQuantity(2, "litres", "ml"), 2000);
        // Discrete units preserve identity
        assert.equal(convertUnitQuantity(5, "portions", "portions"), 5);
        assert.equal(convertUnitQuantity(12, "pieces", "pieces"), 12);
    });
    it("throws clear error on incompatible unit conversions", () => {
        assert.throws(() => {
            convertUnitQuantity(500, "g", "litres");
        }, /Incompatible unit conversion/);
        assert.throws(() => {
            convertUnitQuantity(3, "pieces", "kg");
        }, /Incompatible unit conversion/);
    });
});
describe("Inventory Stock Calculations & Recipe Aggregation", () => {
    it("calculates stock balances after stock_in, stock_out, and wastage", () => {
        const currentStock = 15.0; // 15 kg Wagyu Beef
        // Stock in +5 kg
        const received = 5.0;
        const balanceAfterIn = Math.round((currentStock + received) * 1000) / 1000;
        assert.equal(balanceAfterIn, 20.0);
        // Stock out -2.25 kg
        const used = 2.25;
        const balanceAfterOut = Math.round((balanceAfterIn - used) * 1000) / 1000;
        assert.equal(balanceAfterOut, 17.75);
        // Wastage -0.5 kg
        const wasted = 0.5;
        const balanceAfterWastage = Math.round((balanceAfterOut - wasted) * 1000) / 1000;
        assert.equal(balanceAfterWastage, 17.25);
    });
    it("correctly aggregates recipe ingredient demands for multi-item orders", () => {
        // Recipe: Wagyu Burger -> 0.225 kg beef, 1 pcs bun, 0.025 kg truffle butter
        // Order: 3 Wagyu Burgers
        const recipeIngredients = [
            { rawMaterialId: 1, name: "Wagyu Beef", qty: 0.225, unit: "kg", baseUnit: "kg" },
            { rawMaterialId: 2, name: "Brioche Bun", qty: 1.0, unit: "pieces", baseUnit: "pieces" },
            { rawMaterialId: 3, name: "Truffle Butter", qty: 25.0, unit: "g", baseUnit: "kg" },
        ];
        const orderQty = 3;
        const aggregated = {};
        for (const ing of recipeIngredients) {
            const basePerServing = convertUnitQuantity(ing.qty, ing.unit, ing.baseUnit);
            const totalBase = Math.round(basePerServing * orderQty * 1000) / 1000;
            aggregated[ing.rawMaterialId] = {
                name: ing.name,
                totalBaseQty: totalBase,
                baseUnit: ing.baseUnit,
            };
        }
        assert.equal(aggregated[1].totalBaseQty, 0.675); // 0.225 * 3 = 0.675 kg
        assert.equal(aggregated[1].baseUnit, "kg");
        assert.equal(aggregated[2].totalBaseQty, 3.0); // 1 * 3 = 3 pieces
        assert.equal(aggregated[2].baseUnit, "pieces");
        assert.equal(aggregated[3].totalBaseQty, 0.075); // 25g * 3 = 75g = 0.075 kg
        assert.equal(aggregated[3].baseUnit, "kg");
    });
    it("simulates cancellation reversal restoring exact deducted balances", () => {
        let currentStock = 14.325; // balance after deduction of 0.675 kg
        const returnQty = 0.675;
        const restoredStock = Math.round((currentStock + returnQty) * 1000) / 1000;
        assert.equal(restoredStock, 15.0);
    });
    it("enforces idempotency check flag simulation", () => {
        let inventoryDeducted = false;
        let deductionCount = 0;
        function simulateDeduct() {
            if (inventoryDeducted)
                return; // Idempotent guard
            deductionCount++;
            inventoryDeducted = true;
        }
        simulateDeduct();
        assert.equal(deductionCount, 1);
        assert.equal(inventoryDeducted, true);
        // Duplicate call on retry must do nothing
        simulateDeduct();
        assert.equal(deductionCount, 1);
        // Cancellation reversal simulation
        let reversalCount = 0;
        function simulateReverse() {
            if (!inventoryDeducted)
                return; // Idempotent guard
            reversalCount++;
            inventoryDeducted = false;
        }
        simulateReverse();
        assert.equal(reversalCount, 1);
        assert.equal(inventoryDeducted, false);
        // Duplicate cancellation call on retry must do nothing
        simulateReverse();
        assert.equal(reversalCount, 1);
    });
});
