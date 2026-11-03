import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { CATEGORY_IDS } from "@/lib/constants";
import { cartoonize } from "@/lib/image-model";
import { rateLimit } from "@/lib/store";
const active=new Set<string>();
export const POST=handler(async(req:Request)=>{
 const u=await requireUser();const {image,category}=z.object({image:z.string().max(200),category:z.enum(CATEGORY_IDS).optional()}).parse(await req.json());
 if(active.has(u.id))throw new HttpError(409,"已有图片正在生成，请稍候");
 if(!rateLimit(`cartoon:${u.id}`,20,3600_000))throw new HttpError(429,"生成次数较多，请稍后再试");
 active.add(u.id);try{return NextResponse.json({image:await cartoonize(u.id,image,category)});}finally{active.delete(u.id);}
});
