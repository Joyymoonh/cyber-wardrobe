import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { currentUser } from "@/lib/auth";

export const GET = handler(async () => NextResponse.json({ user: await currentUser() }));
