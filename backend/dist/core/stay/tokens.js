import crypto from "crypto";
export function generateStayToken() {
    return "stay_" + crypto.randomBytes(24).toString("hex");
}
export function generateRoomQrToken() {
    return "room_" + crypto.randomBytes(24).toString("hex");
}
