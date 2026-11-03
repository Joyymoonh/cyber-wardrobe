import "server-only";
import { HttpError } from "./auth";
import { MOBILE_UA } from "./images";
import { assertPublicUrl } from "./llm";
export type ImportStatus = "ready" | "partial" | "blocked" | "invalid";
export type ScrapedProduct = { url: string; platform: "taobao" | "tmall" | "jd" | "other"; title?: string; image?: string; price?: number; brand?: string; partial: boolean; status: ImportStatus; reason: string; productId?: string; sources: Record<string,string> };
const belongs=(host:string,domain:string)=>host===domain || host.endsWith(`.${domain}`);
export function parseShareText(text:string):{url:string|null;title?:string} {
 const cleaned=text.replace(/[\u200b-\u200d\ufeff]/g,"");
 const raw=cleaned.match(/https?:\/\/[^\s"'<>，。「」【】《》]+/i)?.[0];
 const url=raw?.replace(/[)）\]】,，。.!！;；]+$/,"") ?? null;
 const quoted=[...cleaned.matchAll(/[「【]([^」】]{4,160})[」】]/g)].map(m=>m[1]).filter(t=> !/^(淘宝|天猫|京东|JD|淘宝好价)/i.test(t));
 return {url,title:quoted.sort((a,b)=>b.length-a.length)[0]};
}
export function detectPlatform(url:string):ScrapedProduct["platform"] {
 const host=new URL(url).hostname.toLowerCase();
 if(belongs(host,"tmall.com"))return "tmall";
 if(["taobao.com","tb.cn"].some(d=>belongs(host,d)))return "taobao";
 if(["jd.com","3.cn","jd.hk"].some(d=>belongs(host,d)))return "jd";
 return "other";
}
export function productId(url:string):string|undefined {
 const u=new URL(url); const platform=detectPlatform(url);
 if(platform==="taobao" || platform==="tmall")return u.searchParams.get("id")?.match(/^\d+$/)?.[0];
 if(platform==="jd")return u.pathname.match(/(?:product\/)?(\d+)\.html/)?.[1] || u.searchParams.get("sku")?.match(/^\d+$/)?.[0];
}
const decode=(s:string)=>s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff))).trim();
function meta(html:string,name:string) {
 for(const match of html.matchAll(/<meta\b[^>]*>/gi)) {
  const attrs=Object.fromEntries([...match[0].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1].toLowerCase(),decode(m[3])]));
  if((attrs.property || attrs.name)?.toLowerCase()===name)return attrs.content;
 }
}
const cleanTitle=(t?:string)=>t?.replace(/[-_|–]\s*(淘宝网|天猫|Tmall|京东|JD\.COM|手机淘宝).*$/i,"").replace(/【图片.*?】/g,"").trim() || undefined;
export const isBlockedPage=(html:string,url:string)=> /(?:login|passport|captcha|punish|verify)\./i.test(new URL(url).hostname) || /<title[^>]*>[^<]*(登录|验证|安全检查|captcha|punish)/i.test(html) || /请完成.{0,8}验证|滑动.{0,6}验证|访问过于频繁|验证码页面|请登录后继续|_____tmd_____/i.test(html.slice(0,150000));
export function extractFromHtml(html:string,pageUrl:string):Pick<ScrapedProduct,"title"|"image"|"price"|"brand"> {
 if(isBlockedPage(html,pageUrl))return {};
 let title:string|undefined, image:string|undefined, price:number|undefined, brand:string|undefined;
 const nodes:Record<string,unknown>[]=[];
 function collect(value:unknown) { if(Array.isArray(value)){value.forEach(collect);return;} if(value && typeof value==="object"){const o=value as Record<string,unknown>;nodes.push(o);if(o["@graph"])collect(o["@graph"]);} }
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{collect(JSON.parse(m[1]));}catch{}}
 const prod=nodes.find(o=>[].concat(o["@type"] as never).includes("Product" as never));
 if(prod){
  if(typeof prod.name==="string")title=prod.name;
  const im=Array.isArray(prod.image)?prod.image[0]:prod.image;
  image=typeof im==="string"?im:im && typeof im==="object" && "url" in im?String(im.url):undefined;
  const offer=(Array.isArray(prod.offers)?prod.offers[0]:prod.offers) as {price?:unknown}|undefined;price=Number(offer?.price)||undefined;
  const b=prod.brand;brand=typeof b==="string"?b:b && typeof b==="object" && "name" in b?String(b.name):undefined;
 }
 title ??=meta(html,"og:title");image ??=meta(html,"og:image");
 title ??=html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
 // Only explicit product fields; never take a random CDN image from the page.
 const jsonString=(names:string)=>{const m=html.match(new RegExp(`"(?:${names})"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`));try{return m?JSON.parse(m[1]) as string:undefined;}catch{return undefined;}};
 const platform=detectPlatform(pageUrl);
 if(platform==="jd"){image ??=jsonString("mainImage|imagePath|skuImage");title ??=jsonString("skuName|wareName");price ??=Number(jsonString("jdPrice"))||undefined;}
 if(platform==="taobao" || platform==="tmall"){image ??=jsonString("mainPic|mainImage|itemPic|picUrl");title ??=jsonString("itemTitle");price ??=Number(jsonString("reservePrice"))||undefined;}
 let imageUrl:string|undefined;
 if(image){try{const u=new URL(decode(image),pageUrl);if(/^https?:$/.test(u.protocol) && !/logo|favicon|captcha|banner|sprite/i.test(u.pathname))imageUrl=u.toString();}catch{}}
 title=cleanTitle(title?decode(title):undefined);
 if(title && /^(淘宝网|天猫|京东|京东-正品低价|登录|验证)$/i.test(title))title=undefined;
 return { ...(title?{title}:{}),...(imageUrl?{image:imageUrl}:{}),...(price && price>=2 && price<1e6?{price}:{}),...(brand?{brand}:{}) };
}
async function fetchPage(url:string,signal:AbortSignal):Promise<{url:string;html:string;blocked:boolean}> {
 let current=url;const visited=new Set<string>();
 for(let hop=0;hop<7;hop++){
  signal.throwIfAborted();if(visited.has(current))throw new Error("redirect_loop");visited.add(current);
  await assertPublicUrl(current);signal.throwIfAborted();
  const res=await fetch(current,{redirect:"manual",signal,headers:{"User-Agent":MOBILE_UA,"Accept-Language":"zh-CN,zh;q=0.9",Accept:"text/html,*/*"}});
  const loc=res.headers.get("location");if(res.status>=300 && res.status<400 && loc){current=new URL(loc,current).toString();continue;}
  if([401,403,429].includes(res.status))return {url:current,html:"",blocked:true};if(!res.ok)throw new Error("http_error");
  const reader=res.body?.getReader();let bytes=0;const chunks:Uint8Array[]=[];
  if(reader){try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2_000_000){await reader.cancel();break;}chunks.push(value);}}finally{reader.releaseLock();}}
  const html=Buffer.concat(chunks).toString("utf8");
  const jsRedirect=html.match(/(?:var\s+url\s*=|(?:window\.)?location(?:\.href)?\s*=)\s*['"](https?:\/\/[^'"]+)['"]/)?.[1] || html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)/i)?.[1];
  if(jsRedirect && belongs(new URL(current).hostname,"tb.cn")){current=decode(jsRedirect);continue;}
  return {url:current,html,blocked:isBlockedPage(html,current)};
 }
 throw new Error("redirect_limit");
}
export async function scrapeProduct(shareText:string,signal=AbortSignal.timeout(18_000)):Promise<ScrapedProduct> {
 const {url,title:shareTitle}=parseShareText(shareText);
 if(!url)return {url:"",platform:"other",title:shareTitle,partial:true,status:"invalid",reason:"没有找到有效链接，可以补一张商品截图或手动填写。",sources:shareTitle?{title:"share"}:{}};
 // Validate before catch: private addresses must remain rejected.
 await assertPublicUrl(url);
 let page:Awaited<ReturnType<typeof fetchPage>>|undefined, timedOut=false;
 try{page=await fetchPage(url,signal);}catch(e){if(e instanceof HttpError)throw e;timedOut=signal.aborted;}
 const finalUrl=page?.url || url;
 const extracted=page && !page.blocked?extractFromHtml(page.html,finalUrl):{};
 const title=extracted.title || shareTitle;
 const status:ImportStatus=page?.blocked?"blocked":extracted.title && extracted.image?"ready":"partial";
 const sources:Record<string,string>={};for(const key of Object.keys(extracted))sources[key]="page";if(!extracted.title && shareTitle)sources.title="share";
 return {url:finalUrl,platform:detectPlatform(finalUrl),productId:productId(finalUrl),...extracted,title,partial:status!=="ready",status,reason:status==="blocked"?"商品平台要求登录或验证。已保留分享内容，请上传商品截图继续。":timedOut?"读取超时了。可以重试，或直接补一张商品截图。":status==="ready"?"请确认这是你要添加的商品。":"仅获取到部分信息。请补充图片或手动确认衣物属性。",sources};
}
