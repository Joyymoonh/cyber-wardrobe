import "server-only";
import { z } from "zod";
import fs from "node:fs/promises";
import pathModule from "node:path";
import sharp from "sharp";
import { appDb as db } from "./database";
import { encrypt, decrypt } from "./crypto";
import { dollPlacementPrompt } from "./doll-layout";
import { categoryLabel, type Category } from "./constants";
import { HttpError } from "./auth";
import { assertPublicUrl } from "./llm";
import { downloadImage, imagePath, readStoredImage, MAX_UPLOAD_BYTES, saveImage } from "./images";
export const imageConfigSchema=z.object({provider:z.enum(["openai","gemini","dashscope","ark"]),baseUrl:z.string().trim().url().max(300),model:z.string().trim().min(1,"请填写图片编辑模型").max(120),apiKey:z.string().trim().max(500).optional()});
type ImageConfig={provider:"openai"|"gemini"|"dashscope"|"ark";baseUrl:string;model:string;apiKey?:string|null};
export async function imageConfig(userId:string,secret=false) {
 const r=await db().prepare("SELECT * FROM image_configs WHERE user_id=?").get(userId) as {provider:ImageConfig["provider"];base_url:string;model:string;api_key_enc:string|null}|undefined;
 if(!r)return null;
 return {provider:r.provider,baseUrl:r.base_url,model:r.model,hasKey:!!r.api_key_enc,...(secret?{apiKey:r.api_key_enc?decrypt(r.api_key_enc):null}:{})};
}
export async function saveImageConfig(userId:string,input:z.infer<typeof imageConfigSchema>){
 const old=await db().prepare("SELECT api_key_enc, provider FROM image_configs WHERE user_id=?").get(userId) as {api_key_enc:string|null;provider:string}|undefined;
 if(old && old.provider!==input.provider && !input.apiKey)throw new HttpError(400,"切换服务商时请填写对应的新 API Key");
 const key=input.apiKey===undefined?old?.api_key_enc:input.apiKey?encrypt(input.apiKey):null;
 await db().prepare("INSERT INTO image_configs(user_id,provider,base_url,model,api_key_enc) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider,base_url=excluded.base_url,model=excluded.model,api_key_enc=excluded.api_key_enc").run(userId,input.provider,input.baseUrl,input.model,key||null);
}
export const CARTOON_PROMPT="Edit the provided clothing photograph into a single isolated hand-drawn wardrobe game sticker. Preserve the exact garment category, silhouette, dominant colors, patterns, buttons and distinctive details. Remove the person/mannequin, hands, hangers, room, text overlays and ALL background. Do not invent hidden patterns or details. Soft cream-colored cartoon aesthetic, rounded dark-brown outlines, gentle flat shading, frontal view, entire garment visible, positioned according to the doll alignment guide. Output one RGBA image with a truly transparent background, not a checkerboard drawing. Do not add accessories or alter the garment's design. If true transparency is not supported, use a plain warm white background.";
export async function cartoonize(userId:string,key:string,category?:Category, doll:"female"|"male"="female"){
 const prompt=CARTOON_PROMPT+"\n"+dollPlacementPrompt(category)+(category?` The selected target garment category is ${category} (${categoryLabel(category)}). Ignore all other garment categories in the input.`:"");
 const path=imagePath(key);if(!path || !key.startsWith(`${userId}/`))throw new HttpError(404,"原图不存在");
 const input=await readStoredImage(key);if(!input)throw new HttpError(404,"原图不存在");
 const cfg=await imageConfig(userId,true);if(!cfg)throw new HttpError(400,"先到设置中配置「卡通图片模型」，需要支持图片编辑的模型");
 const reference=cfg.provider==="ark"?await sharp(await fs.readFile(pathModule.join(process.cwd(),"public","art",`doll-${doll}.png`))).resize(553,756,{fit:"fill"}).png().toBuffer():null;
 const referenceCanvas=reference?await sharp({create:{width:1024,height:1024,channels:4,background:{r:255,g:250,b:243,alpha:1}}}).composite([{input:reference,left:236,top:166}]).png().toBuffer():null;
 const referencePrompt=prompt+"\nIMAGE 1 is the garment identity source. IMAGE 2 is the exact doll alignment and pose reference, not an outfit source. Match garment scale and position to IMAGE 2 on the same square canvas. Preserve garment design from IMAGE 1. Output ONLY the garment layer on an otherwise transparent square canvas. Never output the doll, face, skin, unitard or reference background. Do not crop or enlarge the garment to fill the canvas.";
 const base=cfg.baseUrl.replace(/\/+$/,"");const signal=AbortSignal.timeout(120_000);
 let url:string,body:BodyInit,headers:Record<string,string>;
 if(cfg.provider==="ark"){
  url=`${base}/images/generations`;
  headers={"Content-Type":"application/json",...(cfg.apiKey?{Authorization:`Bearer ${cfg.apiKey}`}:{})};
  body=JSON.stringify({model:cfg.model,prompt:referencePrompt,image:[`data:image/webp;base64,${input.toString("base64")}`,`data:image/png;base64,${referenceCanvas!.toString("base64")}`],size:"2K",response_format:"url",stream:false,watermark:false});
 }else if(cfg.provider==="dashscope"){
  url=`${base}/services/aigc/multimodal-generation/generation`;
  headers={"Content-Type":"application/json",...(cfg.apiKey?{Authorization:`Bearer ${cfg.apiKey}`}:{})};
  body=JSON.stringify({model:cfg.model,input:{messages:[{role:"user",content:[{image:`data:image/webp;base64,${input.toString("base64")}`},{text:prompt}]}]},parameters:{n:1,watermark:false,prompt_extend:false}});
 }else if(cfg.provider==="gemini"){
  url=`${base}/models/${encodeURIComponent(cfg.model)}:generateContent`;
  headers={"Content-Type":"application/json",...(cfg.apiKey?{"x-goog-api-key":cfg.apiKey}:{})};
  body=JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:"image/webp",data:input.toString("base64")}}]}],generationConfig:{responseModalities:["TEXT","IMAGE"]}});
 }else{
  url=`${base}/images/edits`;headers=cfg.apiKey?{Authorization:`Bearer ${cfg.apiKey}`} : {};
  const f=new FormData();f.set("model",cfg.model);f.set("prompt",prompt);f.set("image",new Blob([new Uint8Array(input)],{type:"image/webp"}),"garment.webp");f.set("n","1");f.set("size","1024x1024");
  if(/^gpt-image/.test(cfg.model)){f.set("background","transparent");f.set("output_format","png");}
  body=f;
 }
 await assertPublicUrl(url);
 const res=await fetch(url,{method:"POST",headers,body,signal,redirect:"error"}).catch(e=>{throw new HttpError(502,e.name==="TimeoutError"?"图片生成超时，请稍后手动重试":"无法连接图片模型，请检查设置");});
 // Bound model responses (base64 images can be large).
 const reader=res.body?.getReader();if(!reader)throw new HttpError(502,"图片模型未返回内容");
 const chunks:Uint8Array[]=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>24*1024*1024){await reader.cancel();throw new HttpError(502,"模型返回的图片过大");}chunks.push(value);}}finally{reader.releaseLock();}
 let data;try{data=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new HttpError(502,"图片接口未返回有效内容");}
 if(!res.ok)throw new HttpError(502,`图片模型返回错误 (${res.status})：${String(data.error?.message || data.message || "请检查模型和接口是否支持图片编辑").slice(0,200)}`);
 let b64:string|undefined;
 if(cfg.provider==="gemini"){
  const parts=data.candidates?.[0]?.content?.parts as {inlineData?:{data?:string};inline_data?:{data?:string}}[]|undefined;
  b64=parts?.find(p=>p.inlineData?.data || p.inline_data?.data)?.inlineData?.data || parts?.find(p=>p.inline_data?.data)?.inline_data?.data;
 }else b64=data.data?.[0]?.b64_json;
 if(b64){const buf=Buffer.from(b64,"base64");if(buf.length>MAX_UPLOAD_BYTES)throw new HttpError(502,"生成图片过大");return saveImage(userId,buf);}
 if(cfg.provider==="dashscope"){
  const parts=data.output?.choices?.[0]?.message?.content as {image?:string}[]|undefined;
  const image=parts?.find(p=>typeof p.image==="string")?.image;
  if(image)return downloadImage(userId,image,undefined,signal);
 }
 if((cfg.provider==="openai" || cfg.provider==="ark") && typeof data.data?.[0]?.url==="string")return downloadImage(userId,data.data[0].url,undefined,signal);
 throw new HttpError(502,"该模型没有返回图片。请使用支持图生图的模型，文字识别模型不能用于卡通化");
}
