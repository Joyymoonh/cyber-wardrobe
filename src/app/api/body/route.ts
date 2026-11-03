import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { bodySchema, getBody, saveBody } from "@/lib/store";

export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ body: await getBody(user.id) });
});

export const PUT = handler(async (req: Request) => {
  const user = await requireUser();
  return NextResponse.json({ body: await saveBody(user.id, bodySchema.parse(await req.json())) });
});
