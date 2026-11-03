import "server-only";
import { z } from "zod";
import { newId, parseJsonArray } from "./db";
import { appDb as db } from "./database";
import { encrypt } from "./crypto";
import { BODY_SHAPE_IDS, STYLE_IDS, type BodyProfile, type Outfit } from "./constants";

// ---------- Body profile ----------

const cm = (min: number, max: number) => z.number().min(min).max(max).nullish().transform((v) => v ?? undefined);

export const bodySchema = z.object({
  gender: z.enum(["female", "male", "other"]).nullish().transform((v) => v ?? undefined),
  heightCm: cm(80, 250),
  weightKg: cm(20, 300),
  shoulderCm: cm(20, 80),
  bustCm: cm(40, 200),
  waistCm: cm(30, 200),
  hipCm: cm(40, 200),
  inseamCm: cm(30, 130),
  scan: z
    .object({ shoulderHipRatio: z.number().min(0.3).max(3), legBodyRatio: z.number().min(0.2).max(0.9), scannedAt: z.number() })
    .nullish()
    .transform((v) => v ?? undefined),
  shape: z.enum(BODY_SHAPE_IDS).nullish().transform((v) => v ?? undefined),
  skinTone: z.enum(["cool", "warm", "neutral"]).nullish().transform((v) => v ?? undefined),
});

export async function getBody(userId: string): Promise<BodyProfile | null> {
  const r = await db().prepare("SELECT data FROM body_profiles WHERE user_id = ?").get(userId) as { data: string } | undefined;
  return r ? (JSON.parse(r.data) as BodyProfile) : null;
}

/** `shape` is only stored when the user overrides it; use effectiveShape() when reading. */
export async function saveBody(userId: string, profile: BodyProfile): Promise<BodyProfile> {
  await db()
    .prepare("INSERT INTO body_profiles (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at")
    .run(userId, JSON.stringify(profile), Date.now());
  return profile;
}

// ---------- LLM settings ----------

export const llmSettingsSchema = z.object({
  provider: z.enum(["openai", "gemini"]),
  baseUrl: z.string().trim().url("Base URL 格式不正确").max(300),
  model: z.string().trim().min(1, "请填写模型名").max(120),
  visionModel: z.string().trim().max(120).nullish(),
  /** Omitted/undefined keeps the stored key; empty string clears it. */
  apiKey: z.string().trim().max(500).optional(),
});

export type PublicLlmSettings = {
  provider: "openai" | "gemini";
  baseUrl: string;
  model: string;
  visionModel: string | null;
  hasKey: boolean;
  keyHint: string | null;
};

export async function getPublicLlmSettings(userId: string): Promise<PublicLlmSettings | null> {
  const r = await db()
    .prepare("SELECT provider, base_url, model, vision_model, api_key_enc FROM llm_configs WHERE user_id = ?")
    .get(userId) as { provider: "openai" | "gemini"; base_url: string; model: string; vision_model: string | null; api_key_enc: string | null } | undefined;
  if (!r) return null;
  return { provider: r.provider, baseUrl: r.base_url, model: r.model, visionModel: r.vision_model, hasKey: !!r.api_key_enc, keyHint: r.api_key_enc ? "已保存（加密存储）" : null };
}

export async function saveLlmSettings(userId: string, s: z.infer<typeof llmSettingsSchema>) {
  const existing = await db().prepare("SELECT api_key_enc FROM llm_configs WHERE user_id = ?").get(userId) as { api_key_enc: string | null } | undefined;
  const keyEnc = s.apiKey === undefined ? (existing?.api_key_enc ?? null) : s.apiKey ? encrypt(s.apiKey) : null;
  await db()
    .prepare(
      `INSERT INTO llm_configs (user_id, provider, base_url, model, vision_model, api_key_enc, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider, base_url=excluded.base_url, model=excluded.model,
       vision_model=excluded.vision_model, api_key_enc=excluded.api_key_enc, updated_at=excluded.updated_at`,
    )
    .run(userId, s.provider, s.baseUrl, s.model, s.visionModel || null, keyEnc, Date.now());
}

export async function deleteLlmSettings(userId: string) {
  await db().prepare("DELETE FROM llm_configs WHERE user_id = ?").run(userId);
}

// ---------- Outfits ----------

export const saveOutfitSchema = z.object({
  title: z.string().trim().min(1).max(40),
  style: z.enum(STYLE_IDS),
  occasion: z.string().trim().max(40).nullish(),
  itemIds: z.array(z.string().uuid()).min(1).max(10),
  reasoning: z.string().max(1000).nullish(),
  tips: z.string().max(1000).nullish(),
  source: z.enum(["ai", "rule"]),
});

type OutfitRow = Record<string, unknown>;
const toOutfit = (r: OutfitRow): Outfit => ({
  id: r.id as string,
  title: r.title as string,
  style: r.style as Outfit["style"],
  occasion: r.occasion as string | null,
  itemIds: parseJsonArray(r.item_ids),
  reasoning: r.reasoning as string | null,
  tips: r.tips as string | null,
  source: r.source as Outfit["source"],
  createdAt: r.created_at as number,
});

export async function listOutfits(userId: string): Promise<Outfit[]> {
  return (await db().prepare("SELECT * FROM outfits WHERE user_id = ? ORDER BY created_at DESC").all(userId) as OutfitRow[]).map(toOutfit);
}

export async function saveOutfit(userId: string, o: z.infer<typeof saveOutfitSchema>): Promise<Outfit> {
  // Only keep item ids that belong to this user.
  const owned = new Set(
    (await db().prepare(`SELECT id FROM items WHERE user_id = ? AND id IN (${o.itemIds.map(() => "?").join(",")})`).all(userId, ...o.itemIds) as { id: string }[]).map((r) => r.id),
  );
  const itemIds = o.itemIds.filter((id) => owned.has(id));
  const id = newId();
  await db()
    .prepare("INSERT INTO outfits (id, user_id, title, style, occasion, item_ids, reasoning, tips, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, userId, o.title, o.style, o.occasion ?? null, JSON.stringify(itemIds), o.reasoning ?? null, o.tips ?? null, o.source, Date.now());
  return toOutfit(await db().prepare("SELECT * FROM outfits WHERE id = ?").get(id) as OutfitRow);
}

export async function deleteOutfit(userId: string, id: string): Promise<boolean> {
  return (await db().prepare("DELETE FROM outfits WHERE id = ? AND user_id = ?").run(id, userId)).changes > 0;
}

// ---------- Rate limiting (in-memory, per process) ----------

const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= limit;
}
