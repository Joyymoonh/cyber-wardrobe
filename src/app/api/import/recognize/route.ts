import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { recognizeItem } from "@/lib/ai";
import { storedImageForVision } from "@/lib/images";
import { loadLlmConfig } from "@/lib/llm";
import { rateLimit } from "@/lib/store";

const schema = z.object({ image: z.string().min(1), title: z.string().max(200).optional() });

/** Runs vision recognition on an already-uploaded photo/screenshot. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (!rateLimit(`recognize:${user.id}`, 60, 3600_000)) throw new HttpError(429, "识别太频繁，请稍后再试");
  const { image, title } = schema.parse(await req.json());
  if (!image.startsWith(`${user.id}/`)) throw new HttpError(403, "无权访问该图片");
  const cfg = await loadLlmConfig(user.id);
  if (!cfg) throw new HttpError(400, "还没有配置大模型，请先在「设置」里添加，或手动填写属性");
  const vision = await storedImageForVision(image);
  if (!vision) throw new HttpError(404, "图片不存在");
  const recognized = await recognizeItem(cfg, { image: vision, title }).catch((e) => {
    if (e instanceof HttpError && e.status === 502 && !cfg.visionModel) {
      throw new HttpError(502, `${e.message}（当前模型可能不支持图片，请在设置里填写视觉模型）`);
    }
    throw e;
  });
  return NextResponse.json({ recognized });
});
