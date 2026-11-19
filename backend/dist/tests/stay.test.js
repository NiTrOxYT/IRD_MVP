import { test, describe } from "node:test";
import assert from "node:assert";
import { generateStayToken, generateOrderNumber, generateGuestOrderToken, verifyGuestOrderToken, } from "../lib/tokens.js";
describe("Stay & Room Access Security", () => {
    test("generates unique cryptographically random stay tokens", () => {
        const t1 = generateStayToken();
        const t2 = generateStayToken();
        assert.ok(t1.startsWith("stay_"));
        assert.ok(t2.startsWith("stay_"));
        assert.notStrictEqual(t1, t2);
        assert.ok(t1.length >= 32);
    });
    test("generates deterministic order number containing room number and date", () => {
        const room = "Villa 4";
        const orderNum = generateOrderNumber(room);
        assert.ok(orderNum.includes("Villa 4"));
        assert.ok(orderNum.startsWith("IRD-"));
    });
    test("signs and cryptographically verifies guest order tracking token", () => {
        const payload = {
            orderId: 101,
            orderNumber: "IRD-301-20261118-482",
            stayId: 5,
            roomNumber: "301",
        };
        const token = generateGuestOrderToken(payload);
        assert.ok(typeof token === "string");
        const verified = verifyGuestOrderToken(token);
        assert.ok(verified);
        assert.strictEqual(verified.orderId, 101);
        assert.strictEqual(verified.roomNumber, "301");
        assert.strictEqual(verified.stayId, 5);
    });
});
