import crypto from "crypto";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "ird_resort_dev_secret_key_84920491";
export function generateStayToken() {
    return "stay_" + crypto.randomBytes(24).toString("hex");
}
export function generateRoomQrToken() {
    return "room_" + crypto.randomBytes(24).toString("hex");
}
export function generateOrderNumber(roomNumber) {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `IRD-${roomNumber}-${dateStr}-${randomSuffix}`;
}
export function generateGuestOrderToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
export function verifyGuestOrderToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
