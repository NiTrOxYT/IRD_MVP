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
    return pool.query(text, params);
}
export const dbAdapter = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
};
