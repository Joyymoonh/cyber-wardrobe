import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  colors TEXT NOT NULL DEFAULT '[]',
  styles TEXT NOT NULL DEFAULT '[]',
  seasons TEXT NOT NULL DEFAULT '[]',
  material TEXT,
  brand TEXT,
  price REAL,
  image TEXT,
  source_url TEXT,
  notes TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS body_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS llm_configs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  base_url TEXT,
  model TEXT NOT NULL,
  vision_model TEXT,
  api_key_enc TEXT,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS item_art (
 item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
 image TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS item_media (
 item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
 cutout_image TEXT,
 image_mode TEXT NOT NULL DEFAULT 'original'
);
CREATE TABLE IF NOT EXISTS stored_images (
 image_key TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, bytes INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS image_configs (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL, base_url TEXT NOT NULL, model TEXT NOT NULL, api_key_enc TEXT
);
CREATE TABLE IF NOT EXISTS outfits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  style TEXT NOT NULL,
  occasion TEXT,
  item_ids TEXT NOT NULL,
  reasoning TEXT,
  tips TEXT,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS wechat_accounts (
 app_id TEXT NOT NULL, openid TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(app_id,openid)
);
`;

const globalForDb = globalThis as unknown as { __cwDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (process.env.DATABASE_URL) throw new Error("SQLite cannot be used when DATABASE_URL is configured");
  if (!globalForDb.__cwDb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const conn = new DatabaseSync(path.join(DATA_DIR, "wardrobe.db"));
    conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    conn.exec(SCHEMA);
    globalForDb.__cwDb = conn;
  }
  return globalForDb.__cwDb;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
