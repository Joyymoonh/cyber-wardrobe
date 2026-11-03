// Downloads weights only. The running app never fetches user photos or models from Hugging Face.
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
const dir=path.join(process.env.DATA_DIR || path.join(process.cwd(),'data'),'models','clothes-segformer');
const repo='Xenova/segformer_b2_clothes';
const endpoint=(process.env.HF_ENDPOINT || 'https://huggingface.co').replace(/\/+$/,'');
// Pin the model revision so downloaded configs and weights always agree.
const revision='cb6ac44e641faa309f29561c1afe08d87ef52631';
await fs.mkdir(path.join(dir,'onnx'),{recursive:true});
for(const name of ['config.json','preprocessor_config.json','onnx/model_quantized.onnx']){
 const dest=path.join(dir,name);
 if(await fs.stat(dest).catch(()=>null)){console.log(`已存在 ${name}`);continue;}
 console.log(`正在下载 ${name}`);
 const res=await fetch(`${endpoint}/${repo}/resolve/${revision}/${name}`,{signal:AbortSignal.timeout(300000)});
 if(!res.ok || !res.body)throw new Error(`下载失败 ${name}: ${res.status}`);
 await pipeline(Readable.fromWeb(res.body),createWriteStream(`${dest}.part`));
 await fs.rename(`${dest}.part`,dest);
}
await fs.writeFile(path.join(dir,'source.json'),JSON.stringify({repo,revision,downloadEndpoint:endpoint,source:'https://huggingface.co/mattmdjaga/segformer_b2_clothes',license:'See upstream model card and training-data terms'},null,2));
console.log('衣物分割模型已就绪。模型只在本机推理，不会上传照片。');
