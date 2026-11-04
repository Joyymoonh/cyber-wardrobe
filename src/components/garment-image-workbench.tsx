"use client";
/* eslint-disable @next/next/no-img-element -- private user images */
import {useEffect,useRef,useState} from "react";
import { Scissors, Paintbrush, Loader2 } from "lucide-react";
import {api,errMsg,imageUrl} from "@/lib/client";
import {categoryLabel} from "@/lib/constants";
import {displayImageKey,type ImageMode} from "@/lib/item-images";
import {Modal} from "./ui";
import type {ItemDraft} from "@/app/(app)/wardrobe/item-form";
type Props={draft:ItemDraft;disabled:boolean;onChange:(patch:Partial<ItemDraft>)=>void;onBusy:(busy:boolean)=>void};
type ExtractResult={image:string;mask:string;width:number;height:number;notice:string};
export function GarmentImageWorkbench({draft,disabled,onChange,onBusy}:Props){
 const [segmentation,setSegmentation]=useState<boolean|null>(null);
 useEffect(()=>{let active=true;api<{segmentation:boolean}>("/api/capabilities").then(r=>{if(active)setSegmentation(r.segmentation || typeof Worker!=="undefined");}).catch(()=>{if(active)setSegmentation(false);});return()=>{active=false;};},[]);
 const [doll,setDoll]=useState<"female"|"male">("female");
 const [task,setTask]=useState<"extract"|"cartoon"|null>(null);
 const [failure,setFailure]=useState("");
 const [cartoonPreview,setCartoonPreview]=useState<string|null>(null);
 const [editor,setEditor]=useState<ExtractResult|null>(null);
 const [cartoonSource,setCartoonSource]=useState<"original"|"cutout">("original");
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const busy=disabled || !!task || !!editor;
 const mode=draft.imageMode || (draft.cartoonImage?"cartoon":draft.cutoutImage?"cutout":"original");
 async function extract(){
  if(!draft.image || !draft.category || lock.current)return;
  lock.current=true;setTask("extract");setFailure("");onBusy(true);
  try{const {segmentInBrowser}=await import("@/lib/browser-segmentation");const blob=await segmentInBrowser(imageUrl(draft.image)!,draft.category);const form=new FormData();form.set("file",blob,"cutout.png");const saved=await api<{key:string}>("/api/upload",{method:"POST",body:form});const r:ExtractResult={image:saved.key,mask:"",width:0,height:0,notice:"真实图片由本机自动分割；请核对是否选中目标衣物。外套可能包含内搭，遮挡部分不会补画。"};if(alive.current)setEditor(r);}
  catch(e){if(alive.current)setFailure(`提取失败：${errMsg(e)}。请换一张清晰、无遮挡的衣物照片后重试。`);}
  finally{lock.current=false;if(alive.current){setTask(null);onBusy(false);}}
 }
 async function cartoon(){
  if(lock.current || !draft.image || !draft.category)return;
  lock.current=true;setTask("cartoon");setFailure("");onBusy(true);
  const image=cartoonSource==="cutout" && draft.cutoutImage?draft.cutoutImage:draft.image;
  try{const r=await api<{image:string}>("/api/images/cartoon",{method:"POST",json:{image,category:draft.category,doll}});if(alive.current)setCartoonPreview(r.image);}
  catch(e){if(alive.current)setFailure(errMsg(e));}
  finally{lock.current=false;if(alive.current){setTask(null);onBusy(false);}}
 }
 if(!draft.image)return null;
 const shown=displayImageKey(draft);
 return <section className="space-y-3 border-t border-cocoa/15 pt-4" aria-label="衣物图片处理">
  <div className="rounded-2xl border border-[#b9cdbd] bg-[#eaf2e8] p-3"><h3 className="flex items-center gap-2 text-sm font-bold"><Scissors className="size-4"/>提取真实衣物</h3><p className="my-2 text-xs text-cocoa/75">按{draft.category?`「${categoryLabel(draft.category)}」`:"所选衣物类型"}去背景，保留真实颜色与纹理，不补画遮挡部分。</p><button type="button" className="btn-ghost w-full" disabled={busy || !draft.category || segmentation!==true} onClick={extract}>{task==="extract"?<><Loader2 className="size-4 animate-spin"/>本机分割中，首次需下载模型…</>:segmentation===null?"检查分割服务…":segmentation?"自动提取并核对":"免费云端暂未开放分割"}</button></div>
  {segmentation===false && <p className="text-xs text-cocoa/75">当前免费服务暂不运行分割模型，可保留原图，或配置生图服务生成卡通图；已有分割图继续保留。</p>}
  {!draft.category && <p className="text-xs text-cocoa/75">先在右侧（手机端下方）选择衣物分类，再提取或卡通化。</p>}
  <div className="rounded-2xl border border-[#dbc6b7] bg-[#fff2e6] p-3"><h3 className="flex items-center gap-2 text-sm font-bold"><Paintbrush className="size-4"/>生成卡通风格</h3><p className="my-2 text-xs text-cocoa/75">支持先分割再转卡通，也可直接使用原图。需先在设置中配置生图服务和自己的 API Key，调用可能产生费用。</p><label className="label">参考人偶<select className="input mt-1" value={doll} disabled={busy} onChange={e=>setDoll(e.target.value as "female"|"male")}><option value="female">女款人偶</option><option value="male">男款人偶</option></select></label>{draft.cutoutImage && <label className="label">使用哪张图生成？<select className="input mt-1" value={cartoonSource} disabled={busy} onChange={e=>setCartoonSource(e.target.value as "original"|"cutout")}><option value="original">原始照片</option><option value="cutout">已提取的真实衣物</option></select></label>}<button type="button" className="btn-ghost w-full" disabled={busy || !draft.category} onClick={cartoon}>{task==="cartoon"?<><Loader2 className="size-4 animate-spin"/>正在画成卡通…</>:"生成卡通衣物图"}</button></div>
  {failure && <p role="alert" className="rounded-xl bg-[#fbe4df] p-3 text-sm">{failure}</p>}
  {cartoonPreview && <div className="glass space-y-3 p-3"><p className="text-xs">卡通预览 · 请核对款式与颜色</p><img src={imageUrl(cartoonPreview)!} alt="待确认的卡通衣物" className="transparency-grid w-full rounded-xl"/><button type="button" disabled={busy} className="btn-primary w-full" onClick={()=>{onChange({cartoonImage:cartoonPreview,imageMode:"cartoon"});setCartoonPreview(null);}}>采用卡通图</button><button type="button" className="btn-ghost w-full" onClick={()=>setCartoonPreview(null)}>不采用，保留原来的图</button></div>}
  {(draft.cutoutImage || draft.cartoonImage) && <div className="space-y-2"><p className="label">衣柜展示哪张图？</p><div className="flex flex-wrap gap-1">{([['original','原图'],['cutout','真实提取'],['cartoon','卡通图']] as [ImageMode,string][]).map(([id,label])=><button type="button" key={id} disabled={busy || id==="cutout"&&!draft.cutoutImage || id==="cartoon"&&!draft.cartoonImage} className={`chip ${mode===id?"chip-on":""}`} aria-pressed={mode===id} onClick={()=>onChange({imageMode:id})}>{label}</button>)}</div>{shown && <img src={imageUrl(shown)!} alt="当前衣柜展示图" className="transparency-grid w-full rounded-xl"/>}<p className="text-xs text-cocoa/75">三种图片独立保留，保存单品后生效。</p></div>}
  {editor && <Modal open onClose={()=>setEditor(null)} title="核对真实提取结果"><img src={imageUrl(editor.image)!} alt="自动分割的真实衣物" className="transparency-grid mx-auto max-h-80 w-full object-contain rounded-2xl"/><p className="my-4 text-sm">{editor.notice}如果选错衣物或边缘不完整，请不要采用，换一张照片后重试。</p><div className="flex gap-2"><button type="button" className="btn-ghost" onClick={()=>setEditor(null)}>不采用</button><button type="button" className="btn-primary" onClick={()=>{onChange({cutoutImage:editor.image,imageMode:"cutout"});setCartoonSource("cutout");setEditor(null);}}>采用真实提取图</button></div></Modal>}
 </section>;
}
