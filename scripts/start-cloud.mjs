import { spawn } from 'node:child_process';
for (const key of ['DATABASE_URL','SUPABASE_URL','APP_SECRET','REGISTRATION_INVITE_CODE']) {
  if (!process.env[key]) throw new Error(`Missing required server environment variable: ${key}`);
}
if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SECRET_KEY');
if (process.env.APP_SECRET.length < 32) throw new Error('APP_SECRET must have at least 32 characters');
if (process.env.STORAGE_PROVIDER !== 'supabase') throw new Error('Cloud deployments must use persistent Supabase Storage');
if (process.env.INSECURE_COOKIES === '1') throw new Error('Cloud deployments require Secure cookies');
const child=spawn(process.execPath,['--disable-warning=ExperimentalWarning','.next/standalone/server.js'],{
  stdio:'inherit',env:{...process.env,HOSTNAME:'0.0.0.0',PORT:process.env.PORT||'10000',NODE_ENV:'production'}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
