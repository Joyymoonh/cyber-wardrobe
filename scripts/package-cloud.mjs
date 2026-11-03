import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),out=path.join(root,'artifacts','render-supabase-source');
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
const dirs=['src','public','supabase'];
const files=['package.json','package-lock.json','next.config.ts','tsconfig.json','postcss.config.mjs','eslint.config.mjs','.gitignore','.env.cloud.example','render.yaml'];
const scripts=['start-cloud.mjs','setup-supabase.mjs','check-cloud.mjs','cloud-config.mjs'];
const manifest=[];
async function copy(rel){
 const from=path.join(root,rel),stat=await fs.lstat(from);
 if(stat.isSymbolicLink())throw new Error('Refuse to package symlink '+rel);
 if(stat.isDirectory()){for(const name of await fs.readdir(from))await copy(path.join(rel,name));return;}
 if(/(^|\/)(data|node_modules|\.git|artifacts|\.next)(\/|$)/.test(rel)||/\.env.*\.local$/.test(rel))throw new Error('Private path in package');
 await fs.mkdir(path.dirname(path.join(out,rel)),{recursive:true});await fs.copyFile(from,path.join(out,rel));manifest.push(rel);
}
for(const rel of [...dirs,...files,...scripts.map(s=>'scripts/'+s),'docs/render-supabase.md'])await copy(rel);
await fs.writeFile(path.join(root,'artifacts','render-supabase-manifest.json'),JSON.stringify(manifest.sort(),null,2)+'\n');
const archive=path.join(root,'artifacts','render-supabase-source.zip');
const result=spawnSync('/usr/bin/ditto',['-c','-k','--sequesterRsrc','--keepParent',out,archive],{stdio:'inherit'});
if(result.status!==0)throw new Error('Source archive failed');
console.log(`Packaged ${manifest.length} source files; no user data, model API keys or local configuration included.`);
