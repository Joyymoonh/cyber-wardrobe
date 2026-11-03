import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { deleteOutfit } from "@/lib/store";

export const DELETE = handler(async (_req: Request, ctx: RouteContext<"/api/outfits/[id]">) => {
  const user = await requireUser();
  if (!await deleteOutfit(user.id, (await ctx.params).id)) throw new HttpError(404, "穿搭不存在");
  return NextResponse.json({ ok: true });
});
