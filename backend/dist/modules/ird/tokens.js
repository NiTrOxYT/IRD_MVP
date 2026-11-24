import jwt from "jsonwebtoken";
const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || "ird_resort_dev_secret_key_84920491";
export function generateOrderNumber(roomNumber) {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `IRD-${roomNumber}-${dateStr}-${randomSuffix}`;
}
export function createOrderTokenHelpers(jwtSecret = DEFAULT_JWT_SECRET) {
    return {
        generateGuestOrderToken(payload) {
            return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
        },
        verifyGuestOrderToken(token) {
            try {
                return jwt.verify(token, jwtSecret);
            }
            catch {
                return null;
            }
        },
    };
}
const defaultHelpers = createOrderTokenHelpers();
export const generateGuestOrderToken = defaultHelpers.generateGuestOrderToken;
export const verifyGuestOrderToken = defaultHelpers.verifyGuestOrderToken;
