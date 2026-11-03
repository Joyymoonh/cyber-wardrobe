import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { chat, loadLlmConfig } from "@/lib/llm";
import { rateLimit } from "@/lib/store";

export const POST = handler(async () => {
  const user = await requireUser();
  if (!rateLimit(`llmtest:${user.id}`, 10, 60_000)) throw new HttpError(429, "测试太频繁");
  const cfg = await loadLlmConfig(user.id);
  if (!cfg) throw new HttpError(400, "请先保存模型配置");
  const started = Date.now();
  const reply = await chat(cfg, { system: "你是一个助手。", prompt: "用不超过8个字回复：连接成功" });
  return NextResponse.json({ ok: true, reply: reply.slice(0, 60), ms: Date.now() - started });
});
