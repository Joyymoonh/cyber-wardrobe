import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listOutfits, saveOutfit, saveOutfitSchema } from "@/lib/store";

export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ outfits: await listOutfits(user.id) });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  return NextResponse.json({ outfit: await saveOutfit(user.id, saveOutfitSchema.parse(await req.json())) }, { status: 201 });
});
