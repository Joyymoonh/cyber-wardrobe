import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, authenticate, createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/store";

const schema = z.object({ email: z.string().trim().email("邮箱格式不正确"), password: z.string().min(1, "请输入密码") });

export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`login:${ip}:${body.email.toLowerCase()}`, 8, 15 * 60_000)) {
    throw new HttpError(429, "尝试次数过多，请 15 分钟后再试");
  }
  const user = await authenticate(body.email, body.password);
  await createSession(user.id);
  return NextResponse.json({ user });
});
