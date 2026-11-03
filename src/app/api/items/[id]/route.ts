import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { deleteImage } from "@/lib/images";
import { deleteItem, getItem, itemInputSchema, updateItem } from "@/lib/items";

type Ctx = RouteContext<"/api/items/[id]">;

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const item = await getItem(user.id, (await ctx.params).id);
  if (!item) throw new HttpError(404, "单品不存在");
  return NextResponse.json({ item });
});

export const PUT = handler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const before = await getItem(user.id, id);
  const item = await updateItem(user.id, id, itemInputSchema.parse(await req.json()));
  if (!item) throw new HttpError(404, "单品不存在");
  if (before?.image && before.image !== item.image) await deleteImage(before.image);
  return NextResponse.json({ item });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const item = await deleteItem(user.id, id);
  if (!item) throw new HttpError(404, "单品不存在");
  await deleteImage(item.image);
  await deleteImage(item.cartoonImage);
  await deleteImage(item.cutoutImage);
  return NextResponse.json({ ok: true });
});
