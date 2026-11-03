import { describe, expect, it } from "vitest";
import { classifyShape, proportionsFromLandmarks } from "@/lib/body";
import { generateRuleOutfits } from "@/lib/outfit-rules";
import { detectPlatform, extractFromHtml, parseShareText } from "@/lib/link-import";
import { extractJson } from "@/lib/llm";
import type { Item } from "@/lib/constants";

const item = (id: string, category: Item["category"], colors: string[], styles: Item["styles"] = ["minimal"]): Item => ({
  id, name: id, category, colors, styles, seasons: [], favorite: false, createdAt: 0,
});

describe("share text parsing", () => {
  it("extracts url and title from a Taobao share blurb", () => {
    const r = parseShareText("【淘宝】https://m.tb.cn/h.5abcDE?tk=xyz 「法式复古碎花连衣裙女夏季」点击链接直接打开");
    expect(r.url).toBe("https://m.tb.cn/h.5abcDE?tk=xyz");
    expect(r.title).toBe("法式复古碎花连衣裙女夏季");
  });
  it("detects platforms", () => {
    expect(detectPlatform("https://item.jd.com/1.html")).toBe("jd");
    expect(detectPlatform("https://detail.tmall.com/item.htm?id=1")).toBe("tmall");
    expect(detectPlatform("https://m.tb.cn/h.x")).toBe("taobao");
    expect(detectPlatform("https://shop.example.com/p")).toBe("other");
  });
});

describe("html extraction", () => {
  it("reads og tags and strips platform suffix", () => {
    const html = `<meta property="og:title" content="白色牛津纺衬衫-淘宝网"><meta property="og:image" content="//img.alicdn.com/a.jpg">`;
    const r = extractFromHtml(html, "https://item.taobao.com/item.htm?id=1");
    expect(r.title).toBe("白色牛津纺衬衫");
    expect(r.image).toBe("https://img.alicdn.com/a.jpg");
  });
  it("drops placeholder prices and JD title suffix", () => {
    const html = `<title>白色衬衫【图片 价格 品牌 评论】-京东</title>"jdPrice":"1"`;
    const r = extractFromHtml(html, "https://item.m.jd.com/product/1.html");
    expect(r.title).toBe("白色衬衫");
    expect(r.price).toBeUndefined();
  });
  it("ignores login-wall titles", () => {
    const r = extractFromHtml("<title>淘宝网 - 登录</title>", "https://item.taobao.com/x");
    expect(r.title).toBeUndefined();
  });
  it("reads JSON-LD products", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Linen Shirt","image":["https://x.com/a.jpg"],"offers":{"price":"199"}}</script>`;
    expect(extractFromHtml(html, "https://x.com/p")).toEqual({ title: "Linen Shirt", image: "https://x.com/a.jpg", price: 199 });
  });
});

describe("extractJson", () => {
  it("handles fenced and chatty output", () => {
    expect(extractJson('好的！\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('结果: {"outfits":[{"x":"}"}]} 希望喜欢')).toEqual({ outfits: [{ x: "}" }] });
  });
});

describe("body", () => {
  it("classifies from measurements", () => {
    expect(classifyShape({ bustCm: 90, waistCm: 62, hipCm: 92 })).toBe("hourglass");
    expect(classifyShape({ bustCm: 82, waistCm: 68, hipCm: 100 })).toBe("pear");
    expect(classifyShape({ bustCm: 100, waistCm: 80, hipCm: 88 })).toBe("inverted_triangle");
    expect(classifyShape({ bustCm: 92, waistCm: 90, hipCm: 94 })).toBe("apple");
  });
  it("computes ratios from landmarks", () => {
    const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
    lm[0] = { x: 0.5, y: 0.1, visibility: 1 };
    lm[11] = { x: 0.4, y: 0.25, visibility: 1 };
    lm[12] = { x: 0.6, y: 0.25, visibility: 1 };
    lm[23] = { x: 0.45, y: 0.5, visibility: 1 };
    lm[24] = { x: 0.55, y: 0.5, visibility: 1 };
    lm[27] = { x: 0.45, y: 0.9, visibility: 1 };
    lm[28] = { x: 0.55, y: 0.9, visibility: 1 };
    const r = proportionsFromLandmarks(lm)!;
    expect(r.shoulderHipRatio).toBeCloseTo(0.2 / (0.1 * 1.35), 2);
    expect(r.legBodyRatio).toBeCloseTo(0.4 / 0.8, 2);
    lm[27].visibility = 0.1;
    expect(proportionsFromLandmarks(lm)).toBeNull();
  });
});

describe("rule outfits", () => {
  const wardrobe = [
    item("t1", "top", ["白色"]), item("t2", "top", ["红色"]),
    item("b1", "bottom", ["黑色"]), item("b2", "bottom", ["蓝色"]),
    item("s1", "shoes", ["白色"]), item("d1", "dress", ["米色"]),
  ];
  it("always produces valid base combos", () => {
    const res = generateRuleOutfits(wardrobe, { style: "minimal", count: 3 }, 42);
    expect(res.length).toBe(3);
    for (const o of res) {
      const cats = o.itemIds.map((id) => wardrobe.find((w) => w.id === id)!.category);
      expect(cats.includes("dress") || (cats.includes("top") && cats.includes("bottom"))).toBe(true);
      expect(new Set(cats).size).toBe(cats.length);
    }
  });
  it("returns nothing without a base", () => {
    expect(generateRuleOutfits([item("s", "shoes", ["黑色"])], { style: "minimal" })).toEqual([]);
  });
});
