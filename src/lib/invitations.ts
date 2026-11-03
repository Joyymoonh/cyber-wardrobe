import "server-only";
import { timingSafeEqual } from "node:crypto";
import { sha256 } from "./crypto";
import { HttpError } from "./auth";
export function checkRegistrationInvite(invite?: string) {
  const expected = process.env.REGISTRATION_INVITE_CODE;
  if (!expected) {
    if (process.env.DATABASE_URL) throw new HttpError(503, "云端试用注册尚未配置，请联系邀请人");
    return;
  }
  if (!timingSafeEqual(Buffer.from(sha256(invite || "")), Buffer.from(sha256(expected)))) throw new HttpError(403, "请输入邀请人提供的邀请码");
}
