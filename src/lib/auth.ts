import "server-only";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { newId } from "./db";
import { transaction, usesPostgres, appDb as db } from "./database";
import { hashPassword, randomToken, sha256, verifyPassword } from "./crypto";

const COOKIE = "cw_session";
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

export type User = { id: string; email: string; nickname: string };

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function registerUser(email: string, nickname: string, password: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  return transaction(async () => {
  const maxUsers = Number(process.env.MAX_USERS || 0);
  // Serialize signups on PostgreSQL; SQLite transactions are already serialized.
  if (maxUsers > 0 && usesPostgres()) await db().prepare("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE").run();
  const exists = await db().prepare("SELECT 1 FROM users WHERE email = ?").get(normalized);
  if (exists) throw new HttpError(409, "该邮箱已注册");
  if (maxUsers > 0) {
    const count = await db().prepare("SELECT COUNT(*) AS total FROM users").get();
    if (Number(count?.total) >= maxUsers) throw new HttpError(403, "试用账号名额已满，请联系邀请人");
  }
  const user = { id: newId(), email: normalized, nickname: nickname.trim() };
  await db().prepare("INSERT INTO users (id, email, nickname, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.email, user.nickname, passwordHash, Date.now());
  return user;
  });
}

export async function authenticate(email: string, password: string): Promise<User> {
  const row = await db()
    .prepare("SELECT id, email, nickname, password_hash FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as (User & { password_hash: string }) | undefined;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new HttpError(401, "邮箱或密码错误");
  }
  return { id: row.id, email: row.email, nickname: row.nickname };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expires = Date.now() + SESSION_TTL_MS;
  await db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  await db().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, expires);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  store.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const authorization = (await headers()).get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await db()
    .prepare(
      `SELECT u.id, u.email, u.nickname FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), Date.now()) as User | undefined;
  return row ? { ...row } : null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "请先登录");
  return user;
}

export const SESSION_COOKIE = COOKIE;

/** For server pages: redirect to login instead of throwing. */
export async function pageUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
