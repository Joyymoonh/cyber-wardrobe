import "server-only";
import { z } from "zod";
import { newId, parseJsonArray } from "./db";
import { transaction, appDb as db } from "./database";
import { HttpError } from "./auth";
import { CATEGORY_IDS, SEASON_IDS, STYLE_IDS, type Item } from "./constants";

export const itemInputSchema = z.object({
  name: z.string().trim().min(1, "请填写名称").max(60),
  category: z.enum(CATEGORY_IDS, { message: "请选择分类" }),
  colors: z.array(z.string().max(10)).max(4).default([]),
  styles: z.array(z.enum(STYLE_IDS)).max(5).default([]),
  seasons: z.array(z.enum(SEASON_IDS)).max(4).default([]),
  material: z.string().trim().max(40).nullish(),
  brand: z.string().trim().max(40).nullish(),
  price: z.number().nonnegative().max(1e7).nullish(),
  image: z.string().max(200).nullish(),
  cartoonImage: z.string().max(200).nullish(),
  cutoutImage: z.string().max(200).nullish(),
  imageMode: z.enum(["original","cutout","cartoon"]).optional(),
  sourceUrl: z.string().url().max(2000).nullish().or(z.literal("")),
  notes: z.string().trim().max(500).nullish(),
  favorite: z.boolean().default(false),
});
export type ItemInput = z.infer<typeof itemInputSchema>;

type Row = Record<string, unknown>;

function toItem(r: Row): Item {
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as Item["category"],
    colors: parseJsonArray(r.colors),
    styles: parseJsonArray(r.styles) as Item["styles"],
    seasons: parseJsonArray(r.seasons) as Item["seasons"],
    material: r.material as string | null,
    brand: r.brand as string | null,
    price: r.price as number | null,
    image: r.image as string | null,
    cartoonImage: r.cartoon_image as string | null,
    cutoutImage: r.cutout_image as string | null,
    imageMode: (r.image_mode ?? (r.cartoon_image ? "cartoon" : r.cutout_image ? "cutout" : "original")) as Item["imageMode"],
    sourceUrl: r.source_url as string | null,
    notes: r.notes as string | null,
    favorite: r.favorite === 1,
    createdAt: r.created_at as number,
  };
}

export async function listItems(userId: string): Promise<Item[]> {
  return (await db().prepare("SELECT items.*, item_art.image AS cartoon_image, item_media.cutout_image, item_media.image_mode FROM items LEFT JOIN item_art ON item_art.item_id=items.id LEFT JOIN item_media ON item_media.item_id=items.id WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Row[]).map(toItem);
}

export async function getItem(userId: string, id: string): Promise<Item | null> {
  const r = await db().prepare("SELECT items.*, item_art.image AS cartoon_image, item_media.cutout_image, item_media.image_mode FROM items LEFT JOIN item_art ON item_art.item_id=items.id LEFT JOIN item_media ON item_media.item_id=items.id WHERE user_id = ? AND items.id = ?").get(userId, id) as Row | undefined;
  return r ? toItem(r) : null;
}

function ownsImage(userId: string, image: string | null | undefined) {
  return !image || image.startsWith(`${userId}/`);
}

export async function createItem(userId: string, input: ItemInput): Promise<Item> {
  return transaction(async () => {
  if (process.env.STORAGE_PROVIDER === "supabase") {
    await db().prepare("UPDATE users SET nickname=nickname WHERE id=?").run(userId);
    const count = await db().prepare("SELECT COUNT(*) AS total FROM items WHERE user_id=?").get(userId);
    if (Number(count?.total) >= 100) throw new HttpError(429, "试用版每人最多保存100件衣物，请先整理衣柜");
  }
  const id = newId();
  await db()
    .prepare(
      `INSERT INTO items (id, user_id, name, category, colors, styles, seasons, material, brand, price, image, source_url, notes, favorite, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id, userId, input.name, input.category,
      JSON.stringify(input.colors), JSON.stringify(input.styles), JSON.stringify(input.seasons),
      input.material ?? null, input.brand ?? null, input.price ?? null,
      ownsImage(userId, input.image) ? (input.image ?? null) : null,
      input.sourceUrl || null, input.notes ?? null, input.favorite ? 1 : 0, Date.now(),
    );
  await saveArt(userId,id,input);
  return (await getItem(userId, id))!;
  });
}

export async function updateItem(userId: string, id: string, input: ItemInput): Promise<Item | null> {
  return transaction(async () => {
  const res = await db()
    .prepare(
      `UPDATE items SET name=?, category=?, colors=?, styles=?, seasons=?, material=?, brand=?, price=?, image=?, source_url=?, notes=?, favorite=?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      input.name, input.category,
      JSON.stringify(input.colors), JSON.stringify(input.styles), JSON.stringify(input.seasons),
      input.material ?? null, input.brand ?? null, input.price ?? null,
      ownsImage(userId, input.image) ? (input.image ?? null) : null,
      input.sourceUrl || null, input.notes ?? null, input.favorite ? 1 : 0, id, userId,
    );
  if (res.changes) await saveArt(userId,id,input);
  return res.changes ? await getItem(userId, id) : null;
  });
}

export async function deleteItem(userId: string, id: string): Promise<Item | null> {
  return transaction(async () => {
  const item = await getItem(userId, id);
  if (item) await db().prepare("DELETE FROM items WHERE id = ? AND user_id = ?").run(id, userId);
  return item;
  });
}

async function saveArt(userId:string,id:string,input:ItemInput) {
 if(input.cutoutImage!==undefined || input.imageMode!==undefined) {
  const previous=await db().prepare("SELECT cutout_image,image_mode FROM item_media WHERE item_id=?").get(id) as {cutout_image:string|null;image_mode:string}|undefined;
  const cutout=input.cutoutImage===undefined?previous?.cutout_image:ownsImage(userId,input.cutoutImage)?input.cutoutImage:null;
  const mode=input.imageMode || previous?.image_mode || (input.cartoonImage?"cartoon":"original");
  await db().prepare("INSERT INTO item_media(item_id,cutout_image,image_mode) VALUES (?,?,?) ON CONFLICT(item_id) DO UPDATE SET cutout_image=excluded.cutout_image,image_mode=excluded.image_mode").run(id,cutout||null,mode);
 }
 if(!Object.prototype.hasOwnProperty.call(input,"cartoonImage"))return;
 if(input.cartoonImage && ownsImage(userId,input.cartoonImage))await db().prepare("INSERT INTO item_art(item_id,image) VALUES (?,?) ON CONFLICT(item_id) DO UPDATE SET image=excluded.image").run(id,input.cartoonImage);
 else await db().prepare("DELETE FROM item_art WHERE item_id=?").run(id);
}
