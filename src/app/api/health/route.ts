import { NextResponse } from "next/server";
import { appDb } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await appDb().prepare("SELECT 1 AS ok").get();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
