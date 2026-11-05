import {chooseTargetMask} from './target-mask';
import { SamModel, SamProcessor, env, RawImage } from '@huggingface/transformers';
env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath='/models/';
if(env.backends.onnx.wasm){env.backends.onnx.wasm.wasmPaths='/onnx/';env.backends.onnx.wasm.numThreads=1;}
let model:ReturnType<typeof SamModel.from_pretrained>|undefined;
let processor:Promise<SamProcessor>|undefined;
self.onmessage=async(event:MessageEvent<{pixels:Uint8ClampedArray;width:number;height:number;points:{x:number;y:number;label:number}[]}>)=>{
 try{
  const {pixels,width,height,points}=event.data;
  if(!points.some(p=>p.label===1))throw new Error('请先点选需要保留的衣物');
  model??=SamModel.from_pretrained('slimsam',{dtype:'q8',device:'wasm',local_files_only:true});
  processor??=SamProcessor.from_pretrained('slimsam',{local_files_only:true}) as Promise<SamProcessor>;
  const [net,proc]=await Promise.all([model,processor]);
  const inputs=await proc(new RawImage(pixels,width,height,4),{input_points:[points.map(p=>[p.x*width,p.y*height])],input_labels:[points.map(p=>p.label)]});
  const output=await net(inputs);
  const masks=await proc.post_process_masks(output.pred_masks,inputs.original_sizes,inputs.reshaped_input_sizes);
  const data=chooseTargetMask(masks[0].data,output.iou_scores.data,width,height,points);
  self.postMessage({masks:[{data,width,height,channels:1}]});
 }catch(error){model=undefined;processor=undefined;self.postMessage({error:error instanceof Error?error.message:'分割失败'});}
};
