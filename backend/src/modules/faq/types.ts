import type { RequestHandler } from "express";

export interface DbPoolClient {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number | null }>;
  release(): void;
}

export interface DbAdapter {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number | null }>;
  connect(): Promise<DbPoolClient>;
}

export interface AuthGuards {
  requireStaff: (
    options?: string | string[] | { permission?: string; permissions?: string[]; roles?: string[] }
  ) => RequestHandler;
  requireActiveStay: RequestHandler;
}

export interface FaqModuleDeps {
  db: DbAdapter;
  auth: AuthGuards;
}
