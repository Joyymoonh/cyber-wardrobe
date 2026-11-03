// Isolated, invite-only local pilot. No existing wardrobe records are copied.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
const root=process.cwd(),dir=path.join(root,'data','pilot');
fs.mkdirSync(dir,{recursive:true,mode:0o700});
const cfgPath=path.join(dir,'access.json');
let cfg;
if(fs.existsSync(cfgPath))cfg=JSON.parse(fs.readFileSync(cfgPath,'utf8'));
else{
 cfg={secret:randomBytes(48).toString('base64url'),email:'hello@closet.local',password:randomBytes(12).toString('base64url'),id:randomUUID()};
 fs.writeFileSync(cfgPath,JSON.stringify(cfg,null,2),{mode:0o600});
}
const db=new DatabaseSync(path.join(dir,'wardrobe.db'));
const schema=fs.readFileSync(path.join(root,'src/lib/db.ts'),'utf8').match(/const SCHEMA = `([\s\S]*?)`;/)?.[1];
if(!schema)throw new Error('Database schema not found');
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');db.exec(schema);
if(!db.prepare('SELECT id FROM users WHERE id=?').get(cfg.id)){
 const salt=randomBytes(16),hash=`scrypt$${salt.toString('base64')}$${scryptSync(cfg.password,salt,64).toString('base64')}`;
 db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(cfg.id,cfg.email,'今天也要穿得开心',hash,Date.now());
 const seed=[['云朵棉T恤','top','白色'],['薄荷色衬衫','top','绿色'],['奶油针织开衫','outer','米色'],['桃子汽水连衣裙','dress','粉色'],['蓝莓牛仔裤','bottom','蓝色'],['焦糖百褶裙','bottom','棕色'],['散步帆布鞋','shoes','白色'],['周末小挎包','bag','棕色']];
 const insert=db.prepare('INSERT INTO items(id,user_id,name,category,colors,styles,seasons,favorite,created_at) VALUES(?,?,?,?,?,?,?,?,?)');
 for(const [name,category,color] of seed)insert.run(randomUUID(),cfg.id,name,category,JSON.stringify([color]),JSON.stringify(['minimal','sweet','korean']),JSON.stringify(['spring','summer','autumn','winter']),0,Date.now());
}
db.close();
const models=path.join(dir,'models');
if(!fs.existsSync(models)&&fs.existsSync(path.join(root,'data','models')))fs.symlinkSync(path.join(root,'data','models'),models,'dir');
console.log('Isolated pilot ready at http://127.0.0.1:3001; credentials stored privately in data/pilot/access.json');
const child=spawn(process.execPath,['--disable-warning=ExperimentalWarning','.next/standalone/server.js'],{cwd:root,stdio:'inherit',env:{...process.env,DATA_DIR:dir,APP_SECRET:cfg.secret,HOSTNAME:'127.0.0.1',PORT:'3001',INSECURE_COOKIES:'0',DISABLE_PUBLIC_REGISTRATION:'1',MINI_INVITE_CODE:''}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
