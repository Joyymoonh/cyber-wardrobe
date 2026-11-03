import {afterAll,afterEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'cw-mini-'));
process.env.DATA_DIR=folder;
let bearer='';
vi.mock('next/headers',()=>({headers:async()=>new Headers(bearer?{authorization:'Bearer '+bearer}:{}),cookies:async()=>({get:()=>undefined})}));
const {db}=await import('@/lib/db');
const {checkMiniInvite,miniSession,revokeMiniSession,wechatUser}=await import('@/lib/mini-auth');
const {currentUser}=await import('@/lib/auth');
const {sha256}=await import('@/lib/crypto');
const miniAuthRoute=await import('@/app/api/mini/auth/route');
const itemRoute=await import('@/app/api/items/[id]/route');
const {createItem,itemInputSchema}=await import('@/lib/items');
const uid=crypto.randomUUID();
db().prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(uid,'mini@test.com','tester','hash',Date.now());
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();bearer='';});
afterAll(async()=>{db().close();await fs.rm(folder,{recursive:true,force:true});});
describe('mini program authentication',()=>{
 it('fails closed without an invitation configuration',()=>{vi.stubEnv('MINI_INVITE_CODE','');expect(()=>checkMiniInvite('any')).toThrow('尚未开放');});
 it('rejects an invalid invitation',()=>{vi.stubEnv('MINI_INVITE_CODE','private-invite');expect(()=>checkMiniInvite('wrong')).toThrow('邀请码不正确');expect(()=>checkMiniInvite('private-invite')).not.toThrow();});
 it('authenticates a bearer token, stores only its hash and revokes it',async()=>{const s=await miniSession(uid);bearer=s.token;expect((await currentUser())?.id).toBe(uid);expect(db().prepare('SELECT token_hash FROM sessions WHERE user_id=?').get(uid)?.token_hash).toBe(sha256(s.token));await revokeMiniSession(s.token);expect(await currentUser()).toBeNull();});
 it('rejects expired and invalid bearer tokens',async()=>{const s=await miniSession(uid);db().prepare('UPDATE sessions SET expires_at=0 WHERE token_hash=?').run(sha256(s.token));bearer=s.token;expect(await currentUser()).toBeNull();bearer='fake';expect(await currentUser()).toBeNull();});
 it('does not return session_key and reuses a verified WeChat identity',async()=>{vi.stubEnv('WECHAT_APP_ID','test-app');vi.stubEnv('WECHAT_APP_SECRET','test-secret');vi.stubEnv('MINI_INVITE_CODE','invite');vi.stubGlobal('fetch',vi.fn(async()=>Response.json({openid:'wx-identity',session_key:'never-return'})));await expect(wechatUser('code','wrong')).rejects.toThrow('邀请码');const user=await wechatUser('code','invite');expect(user).not.toHaveProperty('session_key');expect((await wechatUser('new-code')).id).toBe(user.id);});
 it('does not create a user when WeChat rejects the code',async()=>{vi.stubEnv('WECHAT_APP_ID','test-app');vi.stubEnv('WECHAT_APP_SECRET','test-secret');vi.stubGlobal('fetch',vi.fn(async()=>Response.json({errcode:40029})));await expect(wechatUser('bad')).rejects.toThrow('失效');});
 it('supports invitation registration and password login through the actual endpoint',async()=>{
 vi.stubEnv('MINI_INVITE_CODE','endpoint-invite');
 const call=(body:unknown)=>miniAuthRoute.POST(new Request('http://localhost/api/mini/auth',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'test-registration'},body:JSON.stringify(body)}));
 const denied=await call({action:'register',email:'pilot@test.com',password:'TestPilot123!',nickname:'体验官',invite:'wrong'});expect(denied.status).toBe(403);
 const registered=await call({action:'register',email:'pilot@test.com',password:'TestPilot123!',nickname:'体验官',invite:'endpoint-invite'});expect(registered.status).toBe(200);const data=await registered.json();expect(data.token).toBeTruthy();expect(data.user).not.toHaveProperty('password_hash');
 const logged=await call({action:'login',email:'pilot@test.com',password:'TestPilot123!'});expect(logged.status).toBe(200);expect((await logged.json()).user.id).toBe(data.user.id);
 });
 it('lets the owner open clothing details and hides them from another account',async()=>{
 const item=await createItem(uid,itemInputSchema.parse({name:'私有衬衫',category:'top'}));bearer=(await miniSession(uid)).token;
 const ctx={params:Promise.resolve({id:item.id})};
 expect((await itemRoute.GET(new Request('http://localhost/api/items/'+item.id),ctx)).status).toBe(200);
 const other=crypto.randomUUID();db().prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(other,'other@test.com','other','hash',Date.now());bearer=(await miniSession(other)).token;
 expect((await itemRoute.GET(new Request('http://localhost/api/items/'+item.id),ctx)).status).toBe(404);
 });

});
