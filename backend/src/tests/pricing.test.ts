import { test, describe } from "node:test";
import assert from "node:assert";

interface TestItem {
  name: string;
  basePrice: number;
  quantity: number;
  modifierDeltas: number[];
}

function calculateOrderTotals(items: TestItem[], taxRatePercent: number, serviceChargePercent: number) {
  let subtotal = 0;
  for (const item of items) {
    const modTotal = item.modifierDeltas.reduce((acc, d) => acc + d, 0);
    const unitPrice = item.basePrice + modTotal;
    subtotal += unitPrice * item.quantity;
  }

  const taxRate = taxRatePercent / 100;
  const serviceRate = serviceChargePercent / 100;

  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const serviceCharge = Math.round(subtotal * serviceRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount + serviceCharge) * 100) / 100;

  return { subtotal, taxAmount, serviceCharge, totalAmount };
}

describe("Pricing, Taxes & Modifiers Calculation", () => {
  test("computes accurate subtotal with item quantities and modifier price deltas", () => {
    const items: TestItem[] = [
      {
        name: "Aura Royal Eggs Benedict",
        basePrice: 26.0,
        quantity: 2,
        modifierDeltas: [4.0], // Smoked Atlantic Salmon +$4
      },
      {
        name: "Single Origin Pour Over Coffee",
        basePrice: 9.0,
        quantity: 1,
        modifierDeltas: [],
      },
    ];

    // Item 1: (26 + 4) * 2 = 60
    // Item 2: 9 * 1 = 9
    // Subtotal: 69.00
    // Tax (10%): 6.90
    // Service Charge (5%): 3.45
    // Total: 79.35
    const { subtotal, taxAmount, serviceCharge, totalAmount } = calculateOrderTotals(items, 10.0, 5.0);

    assert.strictEqual(subtotal, 69.0);
    assert.strictEqual(taxAmount, 6.9);
    assert.strictEqual(serviceCharge, 3.45);
    assert.strictEqual(totalAmount, 79.35);
  });

  test("handles zero modifier deltas and rounds cents correctly", () => {
    const items: TestItem[] = [
      {
        name: "Wagyu Tenderloin Burger",
        basePrice: 34.0,
        quantity: 1,
        modifierDeltas: [0.0, 0.0], // Default sides with $0 delta
      },
    ];

    // Subtotal: 34.00
    // Tax (8.25%): 34 * 0.0825 = 2.805 -> 2.81
    // Service (12.5%): 34 * 0.125 = 4.25
    // Total: 34 + 2.81 + 4.25 = 41.06
    const { subtotal, taxAmount, serviceCharge, totalAmount } = calculateOrderTotals(items, 8.25, 12.5);

    assert.strictEqual(subtotal, 34.0);
    assert.strictEqual(taxAmount, 2.81);
    assert.strictEqual(serviceCharge, 4.25);
    assert.strictEqual(totalAmount, 41.06);
  });
});
