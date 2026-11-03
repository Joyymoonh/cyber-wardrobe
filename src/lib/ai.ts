import "server-only";
import { z } from "zod";
import { chat, extractJson, type ImageInput, type LlmConfig } from "./llm";
import {
  CATEGORY_IDS, COLORS, SEASON_IDS, STYLES, STYLE_IDS,
  categoryLabel, styleLabel, type BodyProfile, type Item, type Season, type StyleId,
} from "./constants";
import { describeBody } from "./body";

const COLOR_NAMES = COLORS.map((c) => c.name);

const recognizedSchema = z.object({
  name: z.string().catch(""),
  category: z.enum(CATEGORY_IDS).catch("top"),
  colors: z.array(z.string()).catch([]).transform((cs) => cs.filter((c) => COLOR_NAMES.includes(c)).slice(0, 3)),
  styles: z.array(z.string()).catch([]).transform((s) => s.filter((x): x is StyleId => (STYLE_IDS as string[]).includes(x)).slice(0, 3)),
  seasons: z.array(z.string()).catch([]).transform((s) => s.filter((x): x is Season => (SEASON_IDS as string[]).includes(x))),
  material: z.string().nullish().catch(null),
  brand: z.string().nullish().catch(null),
});
export type Recognized = z.infer<typeof recognizedSchema>;

const TAXONOMY = `分类 category 只能取：${CATEGORY_IDS.map((c) => `${c}(${categoryLabel(c)})`).join("、")}
颜色 colors 只能从中选 1-3 个（主色在前）：${COLOR_NAMES.join("、")}
风格 styles 只能从中选 1-3 个：${STYLES.map((s) => `${s.id}(${s.label})`).join("、")}
季节 seasons 从 spring/summer/autumn/winter 中选适合的`;

export async function recognizeItem(cfg: LlmConfig, input: { image?: ImageInput; title?: string }): Promise<Recognized> {
  const prompt = `请识别这件服饰单品${input.title ? `，商品标题是「${input.title}」` : ""}。
${TAXONOMY}
name 用简洁中文命名（≤12字，如“白色牛津纺衬衫”），不要包含营销词。
只输出 JSON：{"name":"","category":"","colors":[],"styles":[],"seasons":[],"material":"","brand":""}`;
  const text = await chat(cfg, {
    system: "你是一位专业的服装买手，擅长从图片和商品标题中精准识别服饰属性。",
    prompt,
    images: input.image ? [input.image] : undefined,
    json: true,
  });
  return recognizedSchema.parse(extractJson(text));
}

const outfitSchema = z.object({
  outfits: z
    .array(
      z.object({
        title: z.string().catch("今日穿搭"),
        itemIds: z.array(z.string()),
        reasoning: z.string().catch(""),
        tips: z.string().catch(""),
      }),
    )
    .catch([]),
});

export type AiOutfit = { title: string; itemIds: string[]; reasoning: string; tips: string };

export async function generateAiOutfits(
  cfg: LlmConfig,
  ctx: { wardrobe: Item[]; style: StyleId; occasion?: string; season?: Season; weather?: string; body: BodyProfile | null; count: number },
): Promise<AiOutfit[]> {
  // Short ids keep the prompt small and stop the model from mangling UUIDs.
  const shortToId = new Map<string, string>();
  const lines = ctx.wardrobe.map((it, idx) => {
    const sid = `i${idx + 1}`;
    shortToId.set(sid, it.id);
    return `${sid} | ${categoryLabel(it.category)} | ${it.name} | 颜色:${it.colors.join("/") || "-"} | 风格:${it.styles.map(styleLabel).join("/") || "-"} | 季节:${it.seasons.join("/") || "-"}${it.material ? ` | ${it.material}` : ""}`;
  });
  const style = STYLES.find((s) => s.id === ctx.style)!;

  const prompt = `用户衣柜（id | 分类 | 名称 | 属性）：
${lines.join("\n")}

用户身材：${describeBody(ctx.body)}
目标风格：${style.label}（${style.desc}）
${ctx.occasion ? `场合：${ctx.occasion}\n` : ""}${ctx.season ? `季节：${ctx.season}\n` : ""}${ctx.weather ? `天气：${ctx.weather}\n` : ""}
请从衣柜中挑选单品，设计 ${ctx.count} 套不同的完整穿搭。要求：
1. 只能使用上面列出的 id，不要编造单品；每套必须有「上装+下装」或「连衣裙/连体」，再按需搭配外套、鞋、包、配饰。
2. 同一套内同类单品最多一件（配饰除外）；各套之间尽量差异化。
3. 结合身材扬长避短、配色和谐，符合目标风格与场合。
4. reasoning 用 1-2 句话说明搭配思路（配色/版型/为什么适合这位用户）；tips 给一条实用穿着建议（如塞衣角、卷裤脚、配饰点睛），如果衣柜缺少关键单品可以建议补充。
只输出 JSON：{"outfits":[{"title":"不超过10字的标题","itemIds":["i1","i2"],"reasoning":"","tips":""}]}`;

  const text = await chat(cfg, {
    system: "你是一位资深时尚造型师，擅长根据用户现有衣橱与身材做实穿性强的搭配。所有回答用简体中文。",
    prompt,
    json: true,
  });
  const parsed = outfitSchema.parse(extractJson(text));
  const byId = new Map(ctx.wardrobe.map((i) => [i.id, i]));

  return parsed.outfits
    .map((o) => {
      const seenCats = new Set<string>();
      const ids = o.itemIds
        .map((s) => shortToId.get(String(s).trim()) ?? (byId.has(s) ? s : undefined))
        .filter((id): id is string => !!id)
        .filter((id) => {
          const cat = byId.get(id)!.category;
          if (cat !== "accessory" && seenCats.has(cat)) return false;
          seenCats.add(cat);
          return true;
        });
      return { ...o, itemIds: ids };
    })
    .filter((o) => {
      const cats = new Set(o.itemIds.map((id) => byId.get(id)!.category));
      return cats.has("dress") || (cats.has("top") && cats.has("bottom")) || o.itemIds.length >= 2;
    });
}
