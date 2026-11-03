import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, createSession, registerUser } from "@/lib/auth";
import { checkRegistrationInvite } from "@/lib/invitations";
import { rateLimit } from "@/lib/store";

const schema = z.object({
  invite: z.string().max(120).optional(),
  email: z.string().trim().email("邮箱格式不正确").max(120),
  nickname: z.string().trim().min(1, "请填写昵称").max(20, "昵称最多 20 个字"),
  password: z.string().min(8, "密码至少 8 位").max(100),
});

export const POST = handler(async (req: Request) => {
  if (process.env.DISABLE_PUBLIC_REGISTRATION === "1") throw new HttpError(403, "当前仅开放小程序邀请码注册");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`register:${ip}`, 10, 3600_000)) throw new HttpError(429, "注册太频繁，请稍后再试");
  const body = schema.parse(await req.json());
  checkRegistrationInvite(body.invite);
  const user = await registerUser(body.email, body.nickname, body.password);
  await createSession(user.id);
  return NextResponse.json({ user });
});
