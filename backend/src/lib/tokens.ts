import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ird_resort_dev_secret_key_84920491";

export function generateStayToken(): string {
  return "stay_" + crypto.randomBytes(24).toString("hex");
}

export function generatePIN(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function generateOrderNumber(roomNumber: string): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `IRD-${roomNumber}-${dateStr}-${randomSuffix}`;
}

export interface GuestOrderPayload {
  orderId: number;
  orderNumber: string;
  stayId: number;
  roomNumber: string;
}

export function generateGuestOrderToken(payload: GuestOrderPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyGuestOrderToken(token: string): GuestOrderPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as GuestOrderPayload;
  } catch {
    return null;
  }
}
