import "server-only";
import { timingSafeEqual } from "node:crypto";
import { newId } from "./db";
import { transaction, appDb as db } from "./database";
import { HttpError, type User } from "./auth";
import { randomToken, sha256 } from "./crypto";

export function checkMiniInvite(invite?:string){
 const expected=process.env.MINI_INVITE_CODE;
 if(!expected)throw new HttpError(503,"体验注册尚未开放，请联系邀请人");
 const a=Buffer.from(sha256(invite||"")),b=Buffer.from(sha256(expected));
 if(!timingSafeEqual(a,b))throw new HttpError(403,"邀请码不正确");
}
export async function miniSession(userId:string){
 const token=randomToken(),expiresAt=Date.now()+7*86400_000;
 await db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
 await db().prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").run(sha256(token),userId,expiresAt);
 return {token,expiresAt};
}
export async function revokeMiniSession(token:string){await db().prepare("DELETE FROM sessions WHERE token_hash=?").run(sha256(token));}
export async function wechatUser(code:string,invite?:string):Promise<User>{
 const appid=process.env.WECHAT_APP_ID,secret=process.env.WECHAT_APP_SECRET;
 if(!appid||!secret)throw new HttpError(503,"尚未配置微信登录，请先使用邮箱登录");
 const url=new URL("https://api.weixin.qq.com/sns/jscode2session");
 url.search=new URLSearchParams({appid,secret,js_code:code,grant_type:"authorization_code"}).toString();
 const response=await fetch(url,{signal:AbortSignal.timeout(10_000),redirect:"error"}).catch(()=>{throw new HttpError(502,"微信登录连接失败，请重试");});
 const data=await response.json() as {openid?:string;errcode?:number};
 if(!response.ok||data.errcode||!data.openid)throw new HttpError(401,"微信登录凭证失效，请重试");
 const old=await db().prepare("SELECT u.id,u.email,u.nickname FROM wechat_accounts w JOIN users u ON u.id=w.user_id WHERE w.app_id=? AND w.openid=?").get(appid,data.openid) as User|undefined;
 if(old)return {...old};
 checkMiniInvite(invite);
 const user={id:newId(),email:`wx-${newId()}@wechat.invalid`,nickname:"衣柜体验官"};
 return transaction(async()=>{
 const raced=await db().prepare("SELECT u.id,u.email,u.nickname FROM wechat_accounts w JOIN users u ON u.id=w.user_id WHERE w.app_id=? AND w.openid=?").get(appid,data.openid) as User|undefined;
 if(raced)return {...raced};
 await db().prepare("INSERT INTO users(id,email,nickname,password_hash,created_at) VALUES(?,?,?,?,?)").run(user.id,user.email,user.nickname,"wechat-only",Date.now());
 await db().prepare("INSERT INTO wechat_accounts VALUES(?,?,?)").run(appid,data.openid,user.id);
 return user;
 });
}
