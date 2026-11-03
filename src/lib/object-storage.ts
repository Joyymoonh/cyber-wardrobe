import "server-only";
import { HttpError } from "./auth";
export const usesCloudStorage = () => process.env.STORAGE_PROVIDER === "supabase";
export function storageConfig() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "wardrobe-images";
  if (!url || !key) throw new Error("Supabase Storage server configuration is missing");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("SUPABASE_URL must be an HTTPS origin");
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(bucket)) throw new Error("Invalid storage bucket");
  return { origin: parsed.origin, key, bucket };
}
function objectUrl(key: string, authenticated = false) {
  const cfg = storageConfig();
  return `${cfg.origin}/storage/v1/object/${authenticated ? "authenticated/" : ""}${cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
async function storageFetch(url: string, init: RequestInit = {}) {
  const cfg = storageConfig();
  return fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(25_000),
    headers: { apikey: cfg.key, ...(!cfg.key.startsWith("sb_secret_") ? { Authorization: `Bearer ${cfg.key}` } : {}), ...init.headers } });
}
export async function putCloudImage(key: string, data: Buffer) {
  const response = await storageFetch(objectUrl(key), { method: "POST", headers: { "Content-Type": "image/webp", "x-upsert": "false" }, body: new Uint8Array(data) });
  if (!response.ok) throw new HttpError(502, "照片云存储写入失败，请稍后重试");
}
export async function getCloudImage(key: string): Promise<Buffer | null> {
  const response = await storageFetch(objectUrl(key, true));
  if (!response.ok) {
    if (response.status === 404) return null;
    // Storage can return HTTP 400 for a missing object; don't hide auth or service errors.
    const error = await response.json().catch(() => null);
    if (String(error?.statusCode) === "404" || error?.error === "not_found") return null;
    throw new HttpError(502, "照片云存储读取失败，请稍后重试");
  }
  const reader = response.body?.getReader(); if (!reader) return null;
  const chunks: Uint8Array[] = []; let bytes = 0;
  try { while (true) { const {done, value} = await reader.read(); if (done) break; bytes += value.length;
    if (bytes > 12 * 1024 * 1024) { await reader.cancel(); throw new HttpError(413, "云端照片过大"); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function removeCloudImage(key: string) {
  const cfg = storageConfig();
  const response = await storageFetch(`${cfg.origin}/storage/v1/object/${cfg.bucket}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [key] }) });
  if (!response.ok && response.status !== 404) throw new HttpError(502, "云端照片清理失败，请稍后重试");
}
export async function verifyPrivateBucket() {
  const cfg = storageConfig();
  const response = await storageFetch(`${cfg.origin}/storage/v1/bucket/${cfg.bucket}`);
  if (!response.ok) throw new Error("Private photo bucket is unavailable");
  const bucket = await response.json();
  if (bucket.public !== false) throw new Error("Photo bucket must be private");
}
