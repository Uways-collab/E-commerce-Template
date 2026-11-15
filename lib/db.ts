import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * ---------------------------------------------------------------------------
 * Data access layer
 * ---------------------------------------------------------------------------
 * The application talks to a small, opinionated `Database` interface exposed
 * from this module. The default implementation is SQLite (Node's built-in
 * `node:sqlite`, no native build step) which keeps the template runnable
 * anywhere Node 22+ runs: local dev, Docker with a volume, a VPS, Railway,
 * Render, Fly, or a Vercel deployment backed by a persistent disk.
 *
 * Because every query in the app goes through the typed repositories in
 * `lib/repositories/*`, swapping the engine (for example to Supabase/Postgres
 * for a multi-region serverless deployment) means implementing `Database`
 * against `pg` and pointing the repositories at it — nothing in the UI, server
 * actions or domain logic changes. See `docs/ARCHITECTURE.md`.
 */

export type SqlValue = string | number | bigint | null | Uint8Array;
export type Row = Record<string, SqlValue>;

export interface Database {
  all<T = Row>(sql: string, params?: SqlValue[]): T[];
  get<T = Row>(sql: string, params?: SqlValue[]): T | undefined;
  run(sql: string, params?: SqlValue[]): { changes: number; lastInsertRowid: number | bigint };
  exec(sql: string): void;
  transaction<T>(fn: () => T): T;
}

const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");

export function databasePath(): string {
  return path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "./data/store.db");
}

function createSqliteDatabase(): Database {
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");

  // Idempotent schema bootstrap so a fresh clone (or a fresh volume) works
  // without a separate migration step.
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  let depth = 0;

  const api: Database = {
    all<T = Row>(sql: string, params: SqlValue[] = []): T[] {
      return db.prepare(sql).all(...params) as unknown as T[];
    },
    get<T = Row>(sql: string, params: SqlValue[] = []): T | undefined {
      return db.prepare(sql).get(...params) as unknown as T | undefined;
    },
    run(sql: string, params: SqlValue[] = []) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
    },
    exec(sql: string) {
      db.exec(sql);
    },
    transaction<T>(fn: () => T): T {
      // Nested calls reuse the outer transaction.
      if (depth > 0) {
        depth += 1;
        try {
          return fn();
        } finally {
          depth -= 1;
        }
      }
      db.exec("BEGIN IMMEDIATE");
      depth = 1;
      try {
        const result = fn();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      } finally {
        depth = 0;
      }
    },
  };

  return api;
}

const globalForDb = globalThis as unknown as { __pphDb?: Database };

export function db(): Database {
  if (!globalForDb.__pphDb) {
    globalForDb.__pphDb = createSqliteDatabase();
  }
  return globalForDb.__pphDb;
}
