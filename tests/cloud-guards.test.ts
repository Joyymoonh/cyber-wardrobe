import {afterAll,afterEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cw-cloud-guards-'));
process.env.DATA_DIR=dir;
const {db}=await import('@/lib/db');
const {appDb,transaction}=await import('@/lib/database');
const {registerUser}=await import('@/lib/auth');
const {checkRegistrationInvite}=await import('@/lib/invitations');
const {reserveImage}=await import('@/lib/image-quota');
afterEach(()=>vi.unstubAllEnvs());
afterAll(async()=>{db().close();await fs.rm(dir,{recursive:true,force:true});});
describe('cloud pilot limits and transaction safety',()=>{
 it('requires an invitation when cloud storage is configured',()=>{
 vi.stubEnv('DATABASE_URL','postgresql://test');vi.stubEnv('REGISTRATION_INVITE_CODE','');expect(()=>checkRegistrationInvite('anything')).toThrow('尚未配置');
 vi.stubEnv('REGISTRATION_INVITE_CODE','private-invite');expect(()=>checkRegistrationInvite('wrong')).toThrow('邀请码');expect(()=>checkRegistrationInvite('private-invite')).not.toThrow();
 });
 it('caps simultaneous account registrations without a partial third account',async()=>{
 vi.stubEnv('MAX_USERS','2');
 const r=await Promise.allSettled([1,2,3].map(i=>registerUser(`person${i}@test.com`,'test','Strong-test-123!')));
 expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(2);expect(r.filter(x=>x.status==='rejected')).toHaveLength(1);
 expect(db().prepare('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(2);
 });
 it('rolls back failed multi-statement transactions',async()=>{
 await expect(transaction(async()=>{await appDb().prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(crypto.randomUUID(),'rollback@test.com','rollback','hash',Date.now());throw new Error('later write failed');})).rejects.toThrow('later write failed');
 expect(db().prepare('SELECT * FROM users WHERE email=?').get('rollback@test.com')).toBeUndefined();
 });
 it('does not allow concurrent image reservations to exceed the user budget',async()=>{
 const user=db().prepare('SELECT id FROM users LIMIT 1').get()!.id as string;
 const key=`${user}/${crypto.randomUUID()}.webp`;
 db().prepare('INSERT INTO stored_images VALUES(?,?,?,?)').run(key,user,99*1024*1024,Date.now());
 const r=await Promise.allSettled([1,2].map(()=>reserveImage(user,`${user}/${crypto.randomUUID()}.webp`,1024*1024)));
 expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 expect(Number(db().prepare('SELECT SUM(bytes) AS n FROM stored_images WHERE user_id=?').get(user)?.n)).toBe(100*1024*1024);
 });
});
