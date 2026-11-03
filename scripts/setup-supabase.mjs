import fs from 'node:fs/promises';
import {cloudConfig,cloudPool,storageRequest} from './cloud-config.mjs';
let pool;
try {
 const cfg=cloudConfig();pool=cloudPool(cfg);
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(82364017)');
  const sql=await fs.readFile(new URL('../supabase/migrations/001_wardrobe.sql',import.meta.url),'utf8');
  await client.query(sql);await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 console.log('Application schema initialized; anonymous/browser roles have no table access.');
 let response=await storageRequest(cfg,`bucket/${cfg.bucket}`);
 if(response.status===404||response.status===400){
  const detail=await response.json().catch(()=>null);
  if(response.status===404||String(detail?.statusCode)==='404'){
   const created=await storageRequest(cfg,'bucket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cfg.bucket,name:cfg.bucket,public:false,file_size_limit:2*1024*1024,allowed_mime_types:['image/webp']})});
   if(!created.ok&&created.status!==409)throw new Error('Could not create private image bucket');
   response=await storageRequest(cfg,`bucket/${cfg.bucket}`);
  }else throw new Error('Cannot inspect image bucket');
 }
 if(!response.ok)throw new Error('Cannot inspect image bucket');
 const bucket=await response.json();
 if(bucket.public!==false)throw new Error('Existing image bucket is public; refuse to deploy until made private');
 if(Number(bucket.file_size_limit)>2*1024*1024||!bucket.file_size_limit)console.log('Note: application enforces 2MB images; bucket-level limit should also be 2MB.');
 console.log('Private image bucket verified. No personal data was imported.');
}catch(error){console.error('Cloud setup failed:',error.code||error.name,'Check connection, TLS certificate and project permissions; secrets omitted.');process.exitCode=1;}
finally{await pool?.end();}
