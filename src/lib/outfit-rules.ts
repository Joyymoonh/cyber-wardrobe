import { NEUTRAL_COLORS, type BodyShape, type Item, type Season, type StyleId } from "./constants";

/**
 * Offline outfit generator, used when the user has no LLM configured or the LLM call fails.
 * Builds candidate combos (dress | top+bottom) + optional outer/shoes/bag/accessory and scores them.
 */

export type RuleOutfit = { itemIds: string[]; score: number; reasoning: string };

export type RuleOptions = {
  style: StyleId;
  season?: Season;
  bodyShape?: BodyShape;
  count?: number;
};

function colorScore(items: Item[]): number {
  const colors = items.flatMap((i) => i.colors.slice(0, 1));
  const accents = new Set(colors.filter((c) => !NEUTRAL_COLORS.has(c)));
  // Classic rule: at most ~2 accent colors; all-neutral is safe but slightly bland.
  if (accents.size === 0) return 0.8;
  if (accents.size === 1) return 1;
  if (accents.size === 2) return 0.7;
  return 0.3;
}

function fits(item: Item, opts: RuleOptions): number {
  let s = 0;
  if (item.styles.includes(opts.style)) s += 2;
  else if (item.styles.length === 0) s += 0.5;
  if (opts.season) {
    if (item.seasons.includes(opts.season)) s += 1;
    else if (item.seasons.length > 0) s -= 1.5;
  }
  if (item.favorite) s += 0.3;
  return s;
}

function bodyBonus(items: Item[], shape?: BodyShape): number {
  if (!shape) return 0;
  const top = items.find((i) => i.category === "top");
  const bottom = items.find((i) => i.category === "bottom");
  const isDark = (i?: Item) => !!i && ["黑色", "藏青", "棕色", "酒红", "军绿"].includes(i.colors[0] ?? "");
  switch (shape) {
    case "pear":
      return isDark(bottom) && !isDark(top) ? 0.6 : 0;
    case "inverted_triangle":
      return isDark(top) && !isDark(bottom) ? 0.6 : 0;
    case "hourglass":
      return items.some((i) => i.category === "dress") ? 0.4 : 0;
    case "rectangle":
      return items.some((i) => i.category === "accessory") ? 0.3 : 0;
    case "apple":
      return items.some((i) => i.category === "outer") ? 0.3 : 0;
  }
}

/** Deterministic PRNG so repeated "regenerate" clicks with different seeds vary results. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRuleOutfits(wardrobe: Item[], opts: RuleOptions, seed = Date.now()): RuleOutfit[] {
  const rand = mulberry32(seed);
  const by = (cat: Item["category"]) =>
    wardrobe
      .filter((i) => i.category === cat)
      .map((i) => ({ i, s: fits(i, opts) + rand() * 0.8 }))
      .filter((x) => x.s > -1)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6);

  const tops = by("top"), bottoms = by("bottom"), dresses = by("dress");
  const extras = (["outer", "shoes", "bag", "accessory"] as const).map(by);
  const wantsOuter = opts.season === "autumn" || opts.season === "winter";

  const bases: { items: Item[]; s: number }[] = [];
  for (const t of tops) for (const b of bottoms) bases.push({ items: [t.i, b.i], s: t.s + b.s });
  for (const d of dresses) bases.push({ items: [d.i], s: d.s * 2 });

  const scored = bases.map((base) => {
    const items = [...base.items];
    let s = base.s;
    for (const [idx, list] of extras.entries()) {
      const isOuter = idx === 0;
      if (isOuter && !wantsOuter && rand() < 0.6) continue;
      const pick = list.find((x) => colorScore([...items, x.i]) >= 0.7);
      if (pick) {
        items.push(pick.i);
        s += pick.s * 0.5;
      }
    }
    const cs = colorScore(items);
    const bb = bodyBonus(items, opts.bodyShape);
    return { items, score: s * cs + bb * 2 };
  });

  scored.sort((a, b) => b.score - a.score);
  const out: RuleOutfit[] = [];
  const usedBase = new Set<string>();
  for (const c of scored) {
    const key = c.items[0].id;
    if (usedBase.has(key) && out.length < scored.length / 2) continue; // diversify by first piece
    usedBase.add(key);
    out.push({ itemIds: c.items.map((i) => i.id), score: Math.round(c.score * 100) / 100, reasoning: explain(c.items) });
    if (out.length >= (opts.count ?? 3)) break;
  }
  return out;
}

function explain(items: Item[]): string {
  const colors = [...new Set(items.map((i) => i.colors[0]).filter(Boolean))];
  const accents = colors.filter((c) => !NEUTRAL_COLORS.has(c!));
  const palette = accents.length ? `以${accents.join("、")}点缀中性色` : "全中性色调，稳妥耐看";
  return `${items.map((i) => i.name).join(" + ")}。${palette}。`;
}
