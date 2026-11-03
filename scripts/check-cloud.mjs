import {randomUUID} from 'node:crypto';
import {cloudConfig,cloudPool,storageRequest} from './cloud-config.mjs';
let pool;
try{
 const cfg=cloudConfig();pool=cloudPool(cfg);
 const client=await pool.connect();
 try{
  const result=await client.query('SELECT COUNT(*) AS count FROM wardrobe.users');
  console.log('PostgreSQL connected; users:',result.rows[0].count);
  await client.query('BEGIN');const id=randomUUID();
  await client.query('INSERT INTO wardrobe.users(id,email,nickname,password_hash,created_at) VALUES($1,$2,$3,$4,$5)',[id,`${id}@deployment-test.invalid`,'deployment check','unusable',Date.now()]);
  const stored=await client.query('SELECT created_at FROM wardrobe.users WHERE id=$1',[id]);
  if(!Number.isSafeInteger(stored.rows[0]?.created_at))throw new Error('Timestamp mapping failed');
  await client.query('ROLLBACK');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 const response=await storageRequest(cfg,`bucket/${cfg.bucket}`);
 if(!response.ok||(await response.json()).public!==false)throw new Error('Private photo bucket check failed');
 console.log('Database write/rollback and private bucket checks passed.');
 if(process.env.APP_URL){
  const health=await fetch(new URL('/api/health',process.env.APP_URL),{signal:AbortSignal.timeout(90000)});
  if(!health.ok||!(await health.json()).ok)throw new Error('Deployment health check failed');
  const privateRoute=await fetch(new URL('/api/items',process.env.APP_URL),{signal:AbortSignal.timeout(20000)});
  if(privateRoute.status!==401)throw new Error('Unauthenticated items endpoint not protected');
  console.log('Public HTTPS health and anonymous access checks passed.');
 }
}catch(error){console.error('Cloud verification failed:',error.code||error.name,'Check configuration; secrets omitted.');process.exitCode=1;}
finally{await pool?.end();}
