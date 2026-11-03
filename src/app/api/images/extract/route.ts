import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError,requireUser } from "@/lib/auth";
import { CATEGORY_IDS } from "@/lib/constants";
import { extractGarment } from "@/lib/garment-extraction";
import { rateLimit } from "@/lib/store";
const active=new Set<string>();
export const POST=handler(async(req:Request)=>{
 const user=await requireUser();
 if(Number(req.headers.get("content-length"))>5_000_000)throw new HttpError(413,"选区数据过大");
 const input=z.object({image:z.string().max(200),category:z.enum(CATEGORY_IDS),mask:z.string().max(4_000_000).optional()}).parse(await req.json());
 if(!input.mask && active.size>=2)throw new HttpError(429,"提取服务正在忙，请稍后重试");
 if(active.has(user.id))throw new HttpError(409,"正在提取上一张图片，请稍候");
 if(!rateLimit(`extract:${user.id}`,80,3600_000))throw new HttpError(429,"提取太频繁，请稍后再试");
 active.add(user.id);
 try{
  if(input.mask)throw new HttpError(400,"手动选区已停用，请使用自动提取");
  return NextResponse.json(await extractGarment(user.id,input.image,input.category));
 }finally{active.delete(user.id);}
});
