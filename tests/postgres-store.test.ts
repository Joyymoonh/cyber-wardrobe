import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { newDb } from 'pg-mem';
const state=vi.hoisted(()=>({sql:[] as string[],options:undefined as Record<string,unknown>|undefined}));
vi.mock('pg',async()=>{
 const {newDb}=await import('pg-mem');
 const memory=newDb();
 const schema=fs.readFileSync('src/lib/db.ts','utf8').match(/export const SCHEMA = `([\s\S]*?)`;/)![1];
 memory.public.none(schema.replace(/\bINTEGER\b/g,'BIGINT'));
 const adapter=memory.adapters.createPg();
 class TestPool extends adapter.Pool {
  constructor(options:Record<string,unknown>){super();state.options=options;}
  async query(sql:string,values?:unknown[]){state.sql.push(sql);return super.query(sql,values);}
 }
 return {Pool:TestPool,types:{setTypeParser:vi.fn()}};
});
vi.stubEnv('DATABASE_URL','postgresql://test:password@127.0.0.1:5432/test');
vi.stubEnv('APP_SECRET','postgres-test-only-secret-longer-than32');
const {appDb,closeDatabase,postgresSql}=await import('@/lib/database');
const {registerUser,authenticate}=await import('@/lib/auth');
const {createItem,getItem,listItems,updateItem,deleteItem,itemInputSchema}=await import('@/lib/items');
const {getBody,saveBody,saveOutfit,listOutfits,getPublicLlmSettings,saveLlmSettings}=await import('@/lib/store');
const {loadLlmConfig}=await import('@/lib/llm');
const {miniSession,revokeMiniSession}=await import('@/lib/mini-auth');
const {sha256}=await import('@/lib/crypto');
const {imageConfig,saveImageConfig}=await import('@/lib/image-model');
const a=await registerUser('cloud-a@test.com','A','CloudPass123!');
const b=await registerUser('cloud-b@test.com','B','CloudPass456!');
afterEach(()=>vi.unstubAllGlobals());
afterAll(async()=>{await closeDatabase();vi.unstubAllEnvs();});
describe('PostgreSQL persistence adapter (pg-mem compatibility)',()=>{
 it('translates only unquoted placeholders',()=>{
 expect(postgresSql(`SELECT '?' AS literal, "?column", ? -- ?\n/* ? */ WHERE id=?`)).toBe(`SELECT '?' AS literal, "?column", $1 -- ?\n/* ? */ WHERE id=$2`);
 });
 it('retains account passwords and session hashes in PostgreSQL',async()=>{
 expect((await authenticate('cloud-a@test.com','CloudPass123!')).id).toBe(a.id);
 const session=await miniSession(a.id);
 expect((await appDb().prepare('SELECT token_hash FROM sessions WHERE user_id=?').get(a.id))?.token_hash).toBe(sha256(session.token));
 await revokeMiniSession(session.token);
 expect(await appDb().prepare('SELECT * FROM sessions WHERE token_hash=?').get(sha256(session.token))).toBeUndefined();
 });
 it('saves original/cutout/cartoon media atomically and isolates accounts',async()=>{
 const image=`${a.id}/${crypto.randomUUID()}.webp`;
 const i=await createItem(a.id,itemInputSchema.parse({name:'云端衬衫',category:'top',image,cutoutImage:image,cartoonImage:image,imageMode:'cartoon',colors:['米色']}));
 expect(i.createdAt).toBeGreaterThan(1700000000000);expect(i.cartoonImage).toBe(image);
 expect(await getItem(b.id,i.id)).toBeNull();
 expect(await updateItem(b.id,i.id,itemInputSchema.parse({...i,name:'other'}))).toBeNull();
 expect(await deleteItem(b.id,i.id)).toBeNull();
 const changed=await updateItem(a.id,i.id,itemInputSchema.parse({...i,name:'已修改',favorite:true,imageMode:'cutout'}));
 expect(changed).toMatchObject({name:'已修改',favorite:true,imageMode:'cutout',image,cartoonImage:image});
 expect((await listItems(a.id)).length).toBe(1);
 const outfit=await saveOutfit(a.id,{title:'云端搭配',style:'minimal',itemIds:[i.id],source:'rule'});
 expect((await listOutfits(a.id))[0].id).toBe(outfit.id);expect(await listOutfits(b.id)).toEqual([]);
 await deleteItem(a.id,i.id);expect(await getItem(a.id,i.id)).toBeNull();
 expect(await appDb().prepare('SELECT * FROM item_art WHERE item_id=?').get(i.id)).toBeUndefined();
 expect(state.sql).toContain('BEGIN');expect(state.sql).toContain('COMMIT');
 });
 it('keeps body and encrypted model settings outside client-visible secrets',async()=>{
 await saveBody(a.id,{heightCm:168,waistCm:65});expect(await getBody(a.id)).toMatchObject({heightCm:168});expect(await getBody(b.id)).toBeNull();
 await saveLlmSettings(a.id,{provider:'openai',baseUrl:'https://example.com/v1',model:'test',apiKey:'private-key'});
 expect(await getPublicLlmSettings(a.id)).not.toHaveProperty('apiKey');expect((await loadLlmConfig(a.id))?.apiKey).toBe('private-key');
 await saveImageConfig(a.id,{provider:'gemini',baseUrl:'https://example.com/v1beta',model:'image',apiKey:'image-secret'});
 expect(await imageConfig(a.id)).not.toHaveProperty('apiKey');expect((await imageConfig(a.id,true))?.apiKey).toBe('image-secret');
 expect(JSON.stringify(await appDb().prepare('SELECT * FROM image_configs').all())).not.toContain('image-secret');
 });
 it('uses the cloud connection path rather than silently opening SQLite',async()=>{
 const {db}=await import('@/lib/db');expect(()=>db()).toThrow('SQLite cannot');
 expect(state.options).toMatchObject({max:3,ssl:false,options:'-c search_path=wardrobe,public'});
 });
});
// Imported to make the compatibility test's dependency explicit to the type checker.
void newDb;
