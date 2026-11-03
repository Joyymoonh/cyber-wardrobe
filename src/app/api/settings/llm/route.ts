import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteLlmSettings, getPublicLlmSettings, llmSettingsSchema, saveLlmSettings } from "@/lib/store";

export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ settings: await getPublicLlmSettings(user.id) });
});

export const PUT = handler(async (req: Request) => {
  const user = await requireUser();
  await saveLlmSettings(user.id, llmSettingsSchema.parse(await req.json()));
  return NextResponse.json({ settings: await getPublicLlmSettings(user.id) });
});

export const DELETE = handler(async () => {
  const user = await requireUser();
  await deleteLlmSettings(user.id);
  return NextResponse.json({ ok: true });
});
