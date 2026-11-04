"use client";
/* eslint-disable @next/next/no-img-element -- generated raster dolls and private garment images */
import {DOLL_LAYOUT} from "@/lib/doll-layout";
import {type Item} from "@/lib/constants";
import {imageUrl} from "@/lib/client";

export function OutfitDoll({items,model}:{items:Item[];model:"female"|"male"}){
 return <div className="mx-3 rounded-3xl border border-cocoa/10 bg-gradient-to-b from-[#fffaf3] to-[#eee3d3] p-4">
  <div className="relative mx-auto w-full max-w-60 overflow-hidden" style={{aspectRatio:"240 / 400"}} role="img" aria-label={`${model==="female"?"女":"男"}款卡通人偶搭配示意`}>
   <div className="absolute bottom-[3%] left-[21%] h-3 w-[58%] rounded-[50%] bg-[#bca589]/20 blur-sm"/>
   <img src={`/art/doll-${model}.png`} alt="" className="absolute left-0 w-full object-contain" style={{top:"12.5%",height:"82%"}}/>
   {DOLL_LAYOUT.map(l=>{const item=items.find(i=>i.category===l.cat);if(!item)return null;const key=item.cartoonImage||item.cutoutImage;if(!key)return null;
    return <img key={l.cat} src={imageUrl(key)!} alt={item.name} title={item.name} className="absolute object-contain" style={item.cartoonImage?{inset:0,width:"100%",height:"100%"}:{left:`${l.x/240*100}%`,top:`${l.y/400*100}%`,width:`${l.w/240*100}%`,height:`${l.h/400*100}%`}}/>;
   })}
  </div>
  <div className="mt-3 flex flex-wrap justify-center gap-1.5">{items.map(i=><span key={i.id} className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-cocoa/80">{i.name}{!i.cartoonImage&&!i.cutoutImage?" · 待处理图片":""}</span>)}</div>
  <p className="mt-3 text-center text-[10px] leading-relaxed text-cocoa/60">AI 绘制卡通人偶 · 已处理衣物图片叠放示意<br/>非真实试衣，款式与尺码以实物为准</p>
 </div>;
}
