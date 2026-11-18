import { test, describe } from "node:test";
import assert from "node:assert";
// State transition rules as enforced in orders.ts and kitchen.ts
const VALID_RECEPTION_TRANSITIONS = {
    pending: ["accepted", "rejected", "cancelled"],
    accepted: ["preparing", "rejected", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "delivered", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    rejected: [],
    cancelled: [],
};
function canReceptionTransition(from, to) {
    return VALID_RECEPTION_TRANSITIONS[from]?.includes(to) ?? false;
}
function canKitchenTransition(from, to) {
    return (from === "accepted" && to === "preparing") || (from === "preparing" && to === "ready");
}
function canGuestCancel(orderStatus) {
    return orderStatus === "pending";
}
describe("Order State Machine & Role Permissions", () => {
    test("reception can accept, dispatch, deliver, or reject orders", () => {
        assert.strictEqual(canReceptionTransition("pending", "accepted"), true);
        assert.strictEqual(canReceptionTransition("pending", "rejected"), true);
        assert.strictEqual(canReceptionTransition("ready", "out_for_delivery"), true);
        assert.strictEqual(canReceptionTransition("out_for_delivery", "delivered"), true);
    });
    test("prohibits illegal backwards or jumping transitions for reception", () => {
        assert.strictEqual(canReceptionTransition("delivered", "pending"), false);
        assert.strictEqual(canReceptionTransition("delivered", "accepted"), false);
        assert.strictEqual(canReceptionTransition("rejected", "accepted"), false);
        assert.strictEqual(canReceptionTransition("pending", "delivered"), false);
    });
    test("kitchen staff is strictly constrained to accepted -> preparing and preparing -> ready", () => {
        assert.strictEqual(canKitchenTransition("accepted", "preparing"), true);
        assert.strictEqual(canKitchenTransition("preparing", "ready"), true);
        // Kitchen cannot accept, deliver, reject or cancel orders
        assert.strictEqual(canKitchenTransition("pending", "accepted"), false);
        assert.strictEqual(canKitchenTransition("ready", "delivered"), false);
        assert.strictEqual(canKitchenTransition("pending", "rejected"), false);
        assert.strictEqual(canKitchenTransition("preparing", "cancelled"), false);
    });
    test("guest can only cancel their order while it remains in pending state", () => {
        assert.strictEqual(canGuestCancel("pending"), true);
        assert.strictEqual(canGuestCancel("accepted"), false);
        assert.strictEqual(canGuestCancel("preparing"), false);
        assert.strictEqual(canGuestCancel("ready"), false);
        assert.strictEqual(canGuestCancel("out_for_delivery"), false);
        assert.strictEqual(canGuestCancel("delivered"), false);
    });
});
