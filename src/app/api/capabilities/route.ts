import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const GET = handler(async () => {
  await requireUser();
  return NextResponse.json({ segmentation: process.env.SEGMENTATION_ENABLED !== "0" }, { headers: { "Cache-Control": "no-store" } });
});
