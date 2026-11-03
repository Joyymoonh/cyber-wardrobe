import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, types, type PoolClient } from "pg";
import { db as localDb } from "./db";
import type { DatabaseSync } from "node:sqlite";

export const usesPostgres = () => !!process.env.DATABASE_URL;
const context = new AsyncLocalStorage<PoolClient | DatabaseSync>();
let pool: Pool | undefined;
let localTail: Promise<void> = Promise.resolve();
async function localExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const before = localTail;
  let release!: () => void;
  localTail = new Promise<void>(r => { release = r; });
  await before;
  try { return await fn(); } finally { release(); }
}
export function postgresPool() {
  if (!pool) {
    // Dates are epoch milliseconds, safely below JS's integer limit.
    types.setTypeParser(20, value => Number(value));
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    const url = new URL(connectionString);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    // Never allow URL sslmode flags to override certificate validation.
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
    pool = new Pool({ connectionString: url.toString(), max: 3, connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 20_000, statement_timeout: 15_000,
      options: "-c search_path=wardrobe,public", ssl: local ? false : { rejectUnauthorized: true, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n") } : {}) } });
    pool.on("error", () => console.error("Database pool connection interrupted"));
  }
  return pool;
}

/** Translate placeholders, preserving quoted SQL literals, identifiers and comments. */
export function postgresSql(sql: string): string {
  let result = "", index = 0;
  for (let i = 0; i < sql.length;) {
    const c = sql[i];
    if (c === "'" || c === '"') {
      const quote = c; result += c; i++;
      while (i < sql.length) {
        const next = sql[i++]; result += next;
        if (next === quote) { if (sql[i] === quote) { result += sql[i++]; } else break; }
      }
    } else if (sql.slice(i, i + 2) === "--") {
      const end = sql.indexOf("\n", i); const stop = end < 0 ? sql.length : end;
      result += sql.slice(i, stop); i = stop;
    } else if (sql.slice(i, i + 2) === "/*") {
      const end = sql.indexOf("*/", i + 2); const stop = end < 0 ? sql.length : end + 2;
      result += sql.slice(i, stop); i = stop;
    } else if (c === "?") { result += `$${++index}`; i++; }
    else { result += c; i++; }
  }
  return result;
}
async function query(sql: string, values: unknown[], kind: "get" | "all" | "run") {
  const existing = context.getStore();
  if (usesPostgres()) {
    const client = existing as PoolClient | undefined;
    const result = await (client || postgresPool()).query(postgresSql(sql), values);
    return kind === "get" ? result.rows[0] : kind === "all" ? result.rows : { changes: result.rowCount || 0 };
  }
  const execute = async () => {
    const statement = ((existing as DatabaseSync | undefined) || localDb()).prepare(sql);
    const args = values as (string | number | null)[];
    if (kind === "get") return statement.get(...args);
    if (kind === "all") return statement.all(...args);
    return { changes: Number(statement.run(...args).changes) };
  };
  return existing ? execute() : localExclusive(execute);
}
export function appDb() {
  return { prepare(sql: string) { return {
    get: (...values: unknown[]) => query(sql, values, "get") as Promise<Record<string, unknown> | undefined>,
    all: (...values: unknown[]) => query(sql, values, "all") as Promise<Record<string, unknown>[]>,
    run: (...values: unknown[]) => query(sql, values, "run") as Promise<{ changes: number }>,
  }; } };
}
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (context.getStore()) return fn();
  if (usesPostgres()) {
    const client = await postgresPool().connect();
    try {
      await client.query("BEGIN");
      const result = await context.run(client, fn);
      await client.query("COMMIT"); return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  return localExclusive(async () => {
    const conn = localDb(); conn.exec("BEGIN IMMEDIATE");
    try { const result = await context.run(conn, fn); conn.exec("COMMIT"); return result; }
    catch (error) { conn.exec("ROLLBACK"); throw error; }
  });
}
export async function closeDatabase() { await pool?.end(); pool = undefined; }
