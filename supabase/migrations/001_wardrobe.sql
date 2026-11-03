-- Server-only schema: never expose it via the Supabase Data API.
CREATE SCHEMA IF NOT EXISTS wardrobe;
SET search_path TO wardrobe, public;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
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
  favorite BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS body_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS llm_configs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  base_url TEXT,
  model TEXT NOT NULL,
  vision_model TEXT,
  api_key_enc TEXT,
  updated_at BIGINT NOT NULL
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
 image_key TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, bytes BIGINT NOT NULL, created_at BIGINT NOT NULL
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
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS wechat_accounts (
 app_id TEXT NOT NULL, openid TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(app_id,openid)
);

ALTER TABLE wardrobe.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.users FROM anon, authenticated;
ALTER TABLE wardrobe.sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.sessions FROM anon, authenticated;
ALTER TABLE wardrobe.items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.items FROM anon, authenticated;
ALTER TABLE wardrobe.body_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.body_profiles FROM anon, authenticated;
ALTER TABLE wardrobe.llm_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.llm_configs FROM anon, authenticated;
ALTER TABLE wardrobe.item_art ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.item_art FROM anon, authenticated;
ALTER TABLE wardrobe.item_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.item_media FROM anon, authenticated;
ALTER TABLE wardrobe.stored_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.stored_images FROM anon, authenticated;
ALTER TABLE wardrobe.image_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.image_configs FROM anon, authenticated;
ALTER TABLE wardrobe.outfits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.outfits FROM anon, authenticated;
ALTER TABLE wardrobe.wechat_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wardrobe.wechat_accounts FROM anon, authenticated;
REVOKE ALL ON SCHEMA wardrobe FROM anon, authenticated;
