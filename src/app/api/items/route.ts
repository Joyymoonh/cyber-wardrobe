import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createItem, itemInputSchema, listItems } from "@/lib/items";

export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ items: await listItems(user.id) });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const item = await createItem(user.id, itemInputSchema.parse(await req.json()));
  return NextResponse.json({ item }, { status: 201 });
});
