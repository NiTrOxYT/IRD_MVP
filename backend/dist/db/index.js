import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ird_db",
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
});
export async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        return res;
    }
    catch (error) {
        throw error;
    }
}
