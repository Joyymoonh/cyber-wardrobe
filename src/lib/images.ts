import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UPLOAD_DIR, newId } from "./db";
import { HttpError } from "./auth";
import { assertPublicUrl, type ImageInput } from "./llm";

import { usesCloudStorage, putCloudImage, getCloudImage, removeCloudImage } from "./object-storage";

import { reserveImage, releaseImage } from "./image-quota";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** Normalizes any image to a ≤1200px webp under uploads/<userId>/ and returns its public key. */
export async function saveImage(userId: string, input: Buffer, opts: {lossless?:boolean} = {}): Promise<string> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new HttpError(413, "图片太大了（上限 12MB）");
  let out: Buffer;
  try {
    out = await sharp(input, { failOn: "error", limitInputPixels: 20_000_000 })
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, lossless: !!opts.lossless })
      .toBuffer();
  } catch {
    throw new HttpError(400, "无法识别的图片格式");
  }
  const key = `${userId}/${newId()}.webp`;
  if (usesCloudStorage()) {
    await reserveImage(userId, key, out.byteLength);
    try { await putCloudImage(key, out); }
    catch (error) { await releaseImage(key); throw error; }
  }
  else {
    await fs.mkdir(path.join(UPLOAD_DIR, userId), { recursive: true });
    await fs.writeFile(/*turbopackIgnore: true*/ path.join(UPLOAD_DIR, key), out);
  }
  return key;
}

export async function downloadImage(userId: string, url: string, referer?: string, signal = AbortSignal.timeout(20_000)): Promise<string> {
  let current = url;
  for (let hop=0; hop<5; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { redirect: "manual", headers: { "User-Agent": MOBILE_UA, ...(referer ? { Referer: referer } : {}) }, signal });
    const loc=res.headers.get("location");
    if(res.status>=300 && res.status<400 && loc){await res.body?.cancel();current=new URL(loc,current).toString();continue;}
    if(!res.ok || !res.headers.get("content-type")?.startsWith("image/"))throw new HttpError(502,"商品图片下载失败");
    if(Number(res.headers.get("content-length"))>MAX_UPLOAD_BYTES)throw new HttpError(413,"商品图片太大");
    const reader=res.body?.getReader();if(!reader)throw new HttpError(502,"图片内容为空");
    const chunks:Uint8Array[]=[];let bytes=0;
    try { while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>MAX_UPLOAD_BYTES){await reader.cancel();throw new HttpError(413,"商品图片太大");}chunks.push(value);} } finally {reader.releaseLock();}
    return saveImage(userId,Buffer.concat(chunks));
  }
  throw new HttpError(502,"图片跳转次数过多");
}

export function imagePath(key: string): string | null {
  // Keys look like "<uuid>/<uuid>.webp"; reject anything else to avoid path traversal.
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(key)) return null;
  return path.join(UPLOAD_DIR, key);
}

export async function deleteImage(key: string | null | undefined) {
  const p = key ? imagePath(key) : null;
  if (p && key) {
    if (usesCloudStorage()) { await removeCloudImage(key); await releaseImage(key); }
    else await fs.unlink(/*turbopackIgnore: true*/ p).catch(() => {});
  }
}

/** Read through the private storage provider; callers must first authorize the owner. */
export async function readStoredImage(key: string): Promise<Buffer | null> {
  const p = imagePath(key);
  if (!p) return null;
  return usesCloudStorage() ? getCloudImage(key) : fs.readFile(/*turbopackIgnore: true*/ p).catch(() => null);
}

/** Small JPEG for sending to vision models (keeps token cost low). */
export async function toVisionInput(buf: Buffer): Promise<ImageInput> {
  const jpg = await sharp(buf).rotate().resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  return { mime: "image/jpeg", base64: jpg.toString("base64") };
}

export async function storedImageForVision(key: string): Promise<ImageInput | null> {
  const buf = await readStoredImage(key);
  return buf ? toVisionInput(buf) : null;
}

export const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
