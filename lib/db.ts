import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * ---------------------------------------------------------------------------
 * Data access layer
 * ---------------------------------------------------------------------------
 * The application talks to a small, opinionated `Database` interface exposed
 * from this module. The default implementation is SQLite (Node's built-in
 * `node:sqlite`, no native build step) which keeps the template runnable
 * anywhere Node 22+ runs: local dev, Docker with a volume, a VPS, Railway,
 * Render, Fly, or a serverless platform (see the note on read-only filesystems
 * below).
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

/**
 * Additive column migrations. `schema.sql` is idempotent for tables, but an
 * existing database never gains new columns from `CREATE TABLE IF NOT EXISTS`,
 * so every added column is registered here and applied once on boot.
 */
const COLUMN_MIGRATIONS: { table: string; column: string; ddl: string }[] = [
  {
    table: "users",
    column: "session_version",
    ddl: "ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0",
  },
];

function applyColumnMigrations(db: DatabaseSync) {
  for (const migration of COLUMN_MIGRATIONS) {
    const columns = db.prepare(`PRAGMA table_info(${migration.table})`).all() as { name?: string }[];
    if (!columns.some((column) => column.name === migration.column)) {
      db.exec(migration.ddl);
    }
  }
}

const SEED_DATABASE = path.join(process.cwd(), "data", "seed", "store.db");
const TMP_DIRECTORY = path.join(os.tmpdir(), "product-pro-hub");

export type DatabaseSource = "env" | "serverless" | "local";

export interface DatabaseLocation {
  /** Absolute path of the SQLite file. */
  file: string;
  /** Where the path came from — env wins, then the platform, then the repo. */
  source: DatabaseSource;
  /** True when the file lives on an ephemeral filesystem (serverless). */
  ephemeral: boolean;
}

/**
 * Serverless platforms (Vercel, Lambda, Netlify) ship the app in a read-only
 * bundle and expose only `os.tmpdir()` for writes. Pointing SQLite at the
 * deployment directory there fails with EROFS/EACCES on the first request, so
 * the default path follows the platform. Set `DATABASE_PATH` to a mounted
 * volume (or move to Postgres, see docs/ARCHITECTURE.md) for durable data.
 */
export function resolveDatabasePath(
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd(),
  tmpdir: string = os.tmpdir(),
): DatabaseLocation {
  const explicit = env.DATABASE_PATH?.trim();
  if (explicit) {
    return { file: path.resolve(cwd, explicit), source: "env", ephemeral: false };
  }

  const serverless = Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.NETLIFY);
  if (serverless) {
    return { file: path.join(tmpdir, "product-pro-hub", "store.db"), source: "serverless", ephemeral: true };
  }

  return { file: path.resolve(cwd, "./data/store.db"), source: "local", ephemeral: false };
}

export function databasePath(): string {
  return resolveDatabasePath().file;
}

let ephemeralNoticeShown = false;

function isReadOnlyError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}

/**
 * Create the directory, seed a fresh file from the bundled demo database, and
 * open it. Returns the handle plus whether a seed copy was used.
 */
function openAt(file: string): { db: DatabaseSync; seeded: boolean } {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  let seeded = false;
  if (!fs.existsSync(file) && fs.existsSync(SEED_DATABASE)) {
    // Ship-with-the-app demo data so a fresh serverless instance is not empty.
    fs.copyFileSync(SEED_DATABASE, file);
    seeded = true;
  }

  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  return { db, seeded };
}

function openDatabase(): { db: DatabaseSync; file: string; seeded: boolean } {
  const location = resolveDatabasePath();

  try {
    return { ...openAt(location.file), file: location.file };
  } catch (error) {
    // An explicitly configured path that cannot be written on a read-only
    // platform should degrade to a working (if temporary) store instead of
    // taking the whole site down.
    if (location.source === "env" && isReadOnlyError(error)) {
      const fallback = path.join(TMP_DIRECTORY, "store.db");
      console.warn(
        `[db] ${location.file} is not writable (${(error as NodeJS.ErrnoException).code}). ` +
          `Falling back to ${fallback}; data will not persist between instances.`,
      );
      const opened = openAt(fallback);
      return { ...opened, file: fallback };
    }

    throw new Error(
      `Could not open the database at ${location.file}. ` +
        `On a read-only platform set DATABASE_PATH to a writable volume, or leave it unset to use the temporary store.`,
      { cause: error },
    );
  }
}

let openedDatabase: { db: DatabaseSync; file: string; seeded: boolean } | null = null;

/** Path/platform details used by the health endpoint and diagnostics. */
export function databaseInfo() {
  const location = resolveDatabasePath();
  return {
    path: location.file,
    source: location.source,
    ephemeral: location.ephemeral,
    seeded: openedDatabase?.seeded ?? false,
    exists: fs.existsSync(location.file),
  };
}

function createSqliteDatabase(): Database {
  const opened = openDatabase();
  openedDatabase = opened;
  const db = opened.db;

  if (opened.seeded && !ephemeralNoticeShown) {
    ephemeralNoticeShown = true;
    console.info(`[db] Seeded a fresh database at ${opened.file} from the bundled demo snapshot.`);
  }
  if (resolveDatabasePath().ephemeral && !ephemeralNoticeShown) {
    ephemeralNoticeShown = true;
    console.warn(
      `[db] Using the temporary database at ${opened.file} (serverless filesystem). ` +
        `Data written here is lost when the instance is recycled — configure DATABASE_PATH or Postgres for durable data.`,
    );
  }

  // Idempotent schema bootstrap so a fresh clone (or a fresh volume) works
  // without a separate migration step.
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
  applyColumnMigrations(db);

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
