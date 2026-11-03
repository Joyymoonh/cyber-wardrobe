import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { authenticate, registerUser, HttpError } from "@/lib/auth";
import { checkMiniInvite,miniSession,revokeMiniSession,wechatUser } from "@/lib/mini-auth";
import { rateLimit } from "@/lib/store";
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("login"),email:z.string().email().max(120),password:z.string().min(1).max(100)}),
 z.object({action:z.literal("register"),email:z.string().email().max(120),password:z.string().min(8).max(100),nickname:z.string().trim().min(1).max(20),invite:z.string().max(120)}),
 z.object({action:z.literal("wechat"),code:z.string().min(1).max(300),invite:z.string().max(120).optional()}),
 z.object({action:z.literal("logout")})
]);
export const POST=handler(async(req:Request)=>{
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"local";
 if(!rateLimit(`mini-login:${ip}`,12,15*60_000))throw new HttpError(429,"操作太频繁，请稍后再试");
 const body=schema.parse(await req.json());
 if(body.action==="logout"){
 const token=req.headers.get("authorization")?.replace(/^Bearer /,"");
 if(token)await revokeMiniSession(token);
 return NextResponse.json({ok:true});
 }
 let user;
 if(body.action==="wechat")user=await wechatUser(body.code,body.invite);
 else if(body.action==="register"){checkMiniInvite(body.invite);user=await registerUser(body.email,body.nickname,body.password);}
 else user=await authenticate(body.email,body.password);
 return NextResponse.json({user,...await miniSession(user.id)},{headers:{"Cache-Control":"no-store"}});
});
