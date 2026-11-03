import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DATA_DIR } from "./db";
import { HttpError } from "./auth";
import { imagePath, readStoredImage, saveImage } from "./images";
import type { Category } from "./constants";
import { GARMENT_LABELS, combineMasks } from "./garment-mask";
const MODEL_DIR=path.join(DATA_DIR,"models","clothes-segformer");
const MODEL_ERROR="自动提取服务尚未就绪。请稍后重试或联系管理员。";
export async function originalForExtraction(userId:string,key:string){
 const file=imagePath(key);
 if(!file || !key.startsWith(`${userId}/`))throw new HttpError(404,"原图不存在");
 const input=await readStoredImage(key);
 if(!input)throw new HttpError(404,"原图不存在");
 return input;
}
/** Reuse original RGB values, change alpha only. Never inpaint or redraw. */
export async function applyGarmentMask(input:Buffer,mask:Buffer){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const meta=await sharp(mask,{limitInputPixels:2_000_000}).metadata().catch(()=>{throw new HttpError(400,"选区不是有效图片");});
 if(meta.width!==info.width || meta.height!==info.height)throw new HttpError(400,"选区尺寸与原图不一致，请重新提取");
 const alpha=await sharp(mask).removeAlpha().greyscale().raw().toBuffer();
 let visible=0;
 for(let i=0;i<info.width*info.height;i++){
  data[i*4+3]=Math.round(data[i*4+3]*alpha[i]/255);
  if(data[i*4+3]>0)visible++;
 }
 if(!visible)throw new HttpError(422,"没有选中衣物，请补回目标区域后再试");
 return sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
}
let segmenter:Promise<import("@huggingface/transformers").ImageSegmentationPipeline>|undefined;
async function getSegmenter(){
 const file=path.join(MODEL_DIR,"onnx","model_quantized.onnx");
 if(!(await fs.stat(file).catch(()=>null)))throw new HttpError(503,MODEL_ERROR);
 if(!segmenter)segmenter=(async()=>{
  const {pipeline,env}=await import("@huggingface/transformers");
  env.allowRemoteModels=false;
  return pipeline("image-segmentation",MODEL_DIR,{dtype:"q8",device:"cpu",local_files_only:true});
 })().catch(()=>{segmenter=undefined;throw new HttpError(503,"衣物分割模型加载失败，请稍后重试");});
 return segmenter;
}
export async function extractGarment(userId:string,key:string,category:Category){
 if(process.env.SEGMENTATION_ENABLED === "0")throw new HttpError(503,"免费云端暂未启用自动分割，请先使用原图或卡通生成；原图和已填信息会保留。");
 const input=await originalForExtraction(userId,key);
 const {RawImage}=await import("@huggingface/transformers");
 const source=await RawImage.fromBlob(new Blob([new Uint8Array(input)],{type:"image/webp"}));
 const pipe=await getSegmenter();
 const results=await pipe(source);
 const selected=results.filter(r=>!!r.label && GARMENT_LABELS[category].includes(r.label));
 if(!selected.length)throw new HttpError(422,"没有识别到所选类型的衣物。请检查分类并更换清晰照片");
 // Resize individual masks back to original dimensions before compositing.
 const masks=await Promise.all(selected.map(async r=>{
  const result=await sharp(r.mask.data,{raw:{width:r.mask.width,height:r.mask.height,channels:r.mask.channels as 1}}).resize(source.width,source.height,{kernel:"nearest"}).removeAlpha().greyscale().raw().toBuffer();
  return {data:result,width:source.width,height:source.height,channels:1};
 }));
 const alpha=combineMasks(masks,source.width,source.height);
 const mask=await sharp(alpha,{raw:{width:source.width,height:source.height,channels:1}}).png().toBuffer();
 const out=await applyGarmentMask(input,mask);
 return {image:await saveCutout(userId,out),mask:mask.toString("base64"),width:source.width,height:source.height,notice:category==="outer"?"模型将外套与上装归为同一类，可能包含内搭；结果不准确时请勿采用，换一张单独拍摄的外套照片重试。":"只保留照片中可见的部分，遮挡区域不会自动补画。"};
}

/** Crop only fully transparent margins and pad for wardrobe display. */
export async function saveCutout(userId:string,out:Buffer){
 const {data,info}=await sharp(out).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left)throw new HttpError(422,"选区为空");
 const width=right-left+1,height=bottom-top+1;
 const padding=Math.max(0,Math.min(16,Math.floor((1200-Math.max(width,height))/2)));
 const tight=await sharp(out).extract({left,top,width,height}).extend({top:padding,bottom:padding,left:padding,right:padding,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
 return saveImage(userId,tight,{lossless:true});
}
