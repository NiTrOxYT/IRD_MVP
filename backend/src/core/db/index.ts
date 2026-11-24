import pg from "pg";
import dotenv from "dotenv";
import type { DbAdapter } from "../module.js";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ird_db",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export const dbAdapter: DbAdapter = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  connect: () => pool.connect(),
};
