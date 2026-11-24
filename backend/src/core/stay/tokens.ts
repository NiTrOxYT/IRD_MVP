import crypto from "crypto";

export function generateStayToken(): string {
  return "stay_" + crypto.randomBytes(24).toString("hex");
}

export function generateRoomQrToken(): string {
  return "room_" + crypto.randomBytes(24).toString("hex");
}
