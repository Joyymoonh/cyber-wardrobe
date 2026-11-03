import { Pool, types } from 'pg';
export function cloudConfig() {
  const required=['DATABASE_URL','SUPABASE_URL'];
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error('Missing SUPABASE_SECRET_KEY');
  for(const name of required)if(!process.env[name])throw new Error(`Missing ${name}; configure the ignored .env.cloud.local or Render environment`);
  const url=new URL(process.env.SUPABASE_URL);
  if(url.protocol!=='https:'||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw new Error('SUPABASE_URL must be an HTTPS origin');
  const dbUrl=new URL(process.env.DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(dbUrl.protocol))throw new Error('DATABASE_URL must be PostgreSQL');
  const local=['localhost','127.0.0.1','::1'].includes(dbUrl.hostname);
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])dbUrl.searchParams.delete(key);
  const bucket=process.env.SUPABASE_STORAGE_BUCKET||'wardrobe-images';
  if(!/^[a-z0-9][a-z0-9-]{0,62}$/.test(bucket))throw new Error('Invalid bucket name');
  return {origin:url.origin,key,bucket,connectionString:dbUrl.toString(),ssl:local?false:{rejectUnauthorized:true,...(process.env.DATABASE_CA_CERT?{ca:process.env.DATABASE_CA_CERT.replace(/\\n/g,'\n')}:{})}};
}
export function cloudPool(cfg=cloudConfig()) {
  types.setTypeParser(20,Number);
  return new Pool({connectionString:cfg.connectionString,ssl:cfg.ssl,max:2,options:'-c search_path=wardrobe,public',connectionTimeoutMillis:10000,statement_timeout:15000});
}
export async function storageRequest(cfg,path,init={}) {
  return fetch(`${cfg.origin}/storage/v1/${path}`,{...init,redirect:'error',signal:AbortSignal.timeout(25000),headers:{apikey:cfg.key,...(!cfg.key.startsWith('sb_secret_')?{Authorization:`Bearer ${cfg.key}`} : {}),...init.headers}});
}
