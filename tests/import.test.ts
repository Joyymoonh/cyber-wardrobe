import {afterEach, describe,expect,it,vi} from "vitest";
import {detectPlatform, extractFromHtml, parseShareText,productId,scrapeProduct} from "@/lib/link-import";
vi.mock("@/lib/llm",()=>({assertPublicUrl:vi.fn(async(raw:string)=>{const u=new URL(raw);if(u.hostname==="127.0.0.1")throw new (await import("@/lib/auth")).HttpError(400,"内网地址");return u;})}));
afterEach(()=>vi.unstubAllGlobals());
describe("reliable imports",()=>{
 it("cleans invisible text and closing punctuation",()=>expect(parseShareText("看看 https://item.jd.com/123.html）。\u200b").url).toBe("https://item.jd.com/123.html"));
 it("requires a true platform domain",()=>{expect(detectPlatform("https://notjd.com/1")).toBe("other");expect(detectPlatform("https://jd.com.evil.test/1")).toBe("other");});
 it("extracts platform product IDs",()=>{expect(productId("https://item.jd.com/123.html")).toBe("123");expect(productId("https://detail.tmall.com/item.htm?id=456")).toBe("456");});
 it("does not select random recommendation images",()=>expect(extractFromHtml('<title>衬衫-京东</title><img src="//img10.360buyimg.com/ad.jpg">',"https://item.jd.com/123.html").image).toBeUndefined());
 it("supports product arrays and multiple JSON-LD scripts",()=>{const h='<script type="application/ld+json">{"@type":"BreadcrumbList"}</script><script type="application/ld+json">[{"@type":["Thing","Product"],"name":"衬衫","image":{"url":"/shirt.png"}}]</script>';expect(extractFromHtml(h,"https://shop.test/p").image).toBe("https://shop.test/shirt.png");});
 it("drops captcha images and titles",()=>expect(extractFromHtml('<title>登录验证</title><meta property="og:image" content="/captcha.png">',"https://item.jd.com/1.html")).toEqual({}));
 it("keeps share title when blocked",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>new Response("",{status:403})));const r=await scrapeProduct("https://m.tb.cn/h.abc 「薄荷绿纯棉衬衫」");expect(r.status).toBe("blocked");expect(r.title).toBe("薄荷绿纯棉衬衫");expect(r.sources.title).toBe("share");});
 it("reports missing links as invalid drafts",async()=>expect((await scrapeProduct("只有口令，没有链接")).status).toBe("invalid"));
 it("checks every short-link redirect",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>new Response(null,{status:302,headers:{location:"http://127.0.0.1/private"}})));await expect(scrapeProduct("https://m.tb.cn/h.x")).rejects.toThrow("内网地址");});
 it("stops redirect loops and preserves title",async()=>{const fn=vi.fn(async()=>new Response(null,{status:302,headers:{location:"https://m.tb.cn/h.x"}}));vi.stubGlobal("fetch",fn);const r=await scrapeProduct("https://m.tb.cn/h.x 「暖白色连衣裙」");expect(fn).toHaveBeenCalledTimes(1);expect(r.status).toBe("partial");expect(r.title).toBe("暖白色连衣裙");});
 it("returns a retryable timeout result",async()=>{const signal=AbortSignal.abort();const r=await scrapeProduct("https://item.jd.com/123.html 「纯棉蓝色衬衫」",signal);expect(r.reason).toContain("超时");expect(r.title).toBe("纯棉蓝色衬衫");});
});
