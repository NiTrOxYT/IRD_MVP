import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
const JWT_SECRET = process.env.JWT_SECRET || "ird_resort_dev_secret_key_84920491";
export function hashPassword(plainText) {
    return bcrypt.hashSync(plainText, 10);
}
export function comparePassword(plainText, hash) {
    return bcrypt.compareSync(plainText, hash);
}
export function signStaffToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}
export function verifyStaffToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
