import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { generateAiOutfits } from "@/lib/ai";
import { effectiveShape } from "@/lib/body";
import { SEASON_IDS, STYLE_IDS } from "@/lib/constants";
import { listItems } from "@/lib/items";
import { loadLlmConfig } from "@/lib/llm";
import { generateRuleOutfits } from "@/lib/outfit-rules";
import { getBody, rateLimit } from "@/lib/store";

const schema = z.object({
  style: z.enum(STYLE_IDS),
  occasion: z.string().trim().max(40).optional(),
  season: z.enum(SEASON_IDS).optional(),
  weather: z.string().trim().max(40).optional(),
  count: z.number().int().min(1).max(5).default(3),
  mode: z.enum(["auto", "ai", "rule"]).default("auto"),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (!rateLimit(`gen:${user.id}`, 40, 3600_000)) throw new HttpError(429, "生成太频繁，请稍后再试");
  const input = schema.parse(await req.json());
  const wardrobe = await listItems(user.id);
  const hasBase = wardrobe.some((i) => i.category === "dress") ||
    (wardrobe.some((i) => i.category === "top") && wardrobe.some((i) => i.category === "bottom"));
  if (!hasBase) throw new HttpError(400, "衣柜里至少需要一件上装+一件下装，或一件连衣裙，才能开始搭配");

  const body = await getBody(user.id);
  const cfg = input.mode === "rule" ? null : await loadLlmConfig(user.id);
  if (input.mode === "ai" && !cfg) throw new HttpError(400, "还没有配置大模型，请先到「设置」添加 API");

  let notice: string | null = null;
  if (cfg) {
    try {
      // Cap prompt size for large wardrobes: favorites + matching style first.
      const ranked = [...wardrobe].sort((a, b) =>
        Number(b.styles.includes(input.style)) + Number(b.favorite) - Number(a.styles.includes(input.style)) - Number(a.favorite));
      const outfits = await generateAiOutfits(cfg, { ...input, wardrobe: ranked.slice(0, 120), body });
      if (outfits.length) {
        return NextResponse.json({ outfits: outfits.map((o) => ({ ...o, source: "ai" as const })), notice });
      }
      notice = "大模型没有给出有效搭配，已改用内置算法";
    } catch (e) {
      if (input.mode === "ai") throw e;
      notice = `大模型调用失败，已改用内置算法：${e instanceof Error ? e.message : ""}`;
    }
  } else if (input.mode === "auto") {
    notice = "未配置大模型，使用内置搭配算法。去「设置」接入 API 可获得更聪明的建议";
  }

  const outfits = generateRuleOutfits(wardrobe, { ...input, bodyShape: effectiveShape(body) }).map((o, i) => ({
    title: `${["灵感", "日常", "出街", "周末", "精选"][i % 5]}搭配 ${i + 1}`,
    itemIds: o.itemIds,
    reasoning: o.reasoning,
    tips: "",
    source: "rule" as const,
  }));
  return NextResponse.json({ outfits, notice });
});
