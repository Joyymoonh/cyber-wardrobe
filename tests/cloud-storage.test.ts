import {afterAll,afterEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cw-cloud-storage-'));
process.env.DATA_DIR=dir;
const {db}=await import('@/lib/db');
const {saveImage,readStoredImage,deleteImage}=await import('@/lib/images');
const {verifyPrivateBucket}=await import('@/lib/object-storage');
const {reserveImage}=await import('@/lib/image-quota');
const uid=crypto.randomUUID();db().prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(uid,'storage@test.com','storage','hash',Date.now());
const png=await sharp({create:{width:32,height:32,channels:4,background:'#f4b6c8'}}).png().toBuffer();
function configure(){vi.stubEnv('STORAGE_PROVIDER','supabase');vi.stubEnv('SUPABASE_URL','https://test.supabase.co');vi.stubEnv('SUPABASE_SECRET_KEY','sb_secret_server-only');}
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
afterAll(async()=>{db().close();await fs.rm(dir,{recursive:true,force:true});});
describe('private cloud photo storage',()=>{
 it('uploads and retrieves through a server key without a local file',async()=>{
 configure();let data:Uint8Array;const fn=vi.fn(async(url:unknown,init?:RequestInit)=>{
 expect((init?.headers as Record<string,string>).apikey).toBe('sb_secret_server-only');
 expect((init?.headers as Record<string,string>).Authorization).toBeUndefined();
 if(init?.method==='POST'){data=init.body as Uint8Array;return Response.json({Key:'saved'});}
 if(init?.method==='DELETE')return Response.json([]);
 expect(String(url)).toContain('/object/authenticated/wardrobe-images/');return new Response(new Uint8Array(data!));});vi.stubGlobal('fetch',fn);
 const key=await saveImage(uid,png);expect(await fs.stat(path.join(dir,'uploads',key)).catch(()=>null)).toBeNull();
 expect(await readStoredImage(key)).toBeTruthy();expect(db().prepare('SELECT bytes FROM stored_images WHERE image_key=?').get(key)?.bytes).toBeGreaterThan(0);
 await deleteImage(key);expect(db().prepare('SELECT * FROM stored_images WHERE image_key=?').get(key)).toBeUndefined();
 });
 it('releases reserved quota when upload fails',async()=>{
 configure();vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'down'},{status:503})));
 const before=db().prepare('SELECT COUNT(*) AS n FROM stored_images').get()?.n;
 await expect(saveImage(uid,png)).rejects.toThrow('写入失败');
 expect(db().prepare('SELECT COUNT(*) AS n FROM stored_images').get()?.n).toBe(before);
 });
 it('rejects invalid keys without a network request',async()=>{
 configure();const fn=vi.fn();vi.stubGlobal('fetch',fn);expect(await readStoredImage('../another/photo.webp')).toBeNull();expect(fn).not.toHaveBeenCalled();
 });
 it('rejects public buckets and preserves server failures',async()=>{
 configure();vi.stubGlobal('fetch',vi.fn(async()=>Response.json({public:true})));
 await expect(verifyPrivateBucket()).rejects.toThrow('must be private');
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'Unauthorized'},{status:401})));
 await expect(readStoredImage(`${uid}/${crypto.randomUUID()}.webp`)).rejects.toThrow('读取失败');
 });
 it('limits cloud image size before upload',async()=>{
 configure();await expect(reserveImage(uid,`${uid}/${crypto.randomUUID()}.webp`,2*1024*1024+1)).rejects.toThrow('上限2MB');
 });
});
