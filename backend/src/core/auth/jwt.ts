import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { StaffPayload } from "../module.js";

const JWT_SECRET = process.env.JWT_SECRET || "ird_resort_dev_secret_key_84920491";

export type StaffSessionPayload = StaffPayload;

export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, 10);
}

export function comparePassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

export function signStaffToken(payload: StaffSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyStaffToken(token: string): StaffSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as StaffSessionPayload;
  } catch {
    return null;
  }
}
