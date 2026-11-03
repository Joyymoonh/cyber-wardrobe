"use client";
import {DOLL_LAYOUT} from "@/lib/doll-layout";
import {GarmentShape} from "./art";
import {colorHex,type Item} from "@/lib/constants";

export function OutfitDoll({items,model}:{items:Item[];model:"female"|"male"}){
 const female=model==="female";
 // Each viewBox follows the visible garment bounds, rather than its illustration canvas.
 const layers=DOLL_LAYOUT;
 return <div className="mx-5 rounded-3xl border border-cocoa/15 bg-[#f4eadb] p-3"><svg viewBox="0 0 240 400" className="mx-auto h-80 w-full" role="img" aria-label={`${female?'女':'男'}款固定卡通人偶搭配示意`}>
 <ellipse cx="120" cy="383" rx="69" ry="9" fill="#ddc8ad"/>
 <g stroke="#6e5543" strokeWidth="2.5" strokeLinejoin="round" fill="#f2ceb1">
 <path d="M94 202L95 360Q101 373 111 360L120 257L129 360Q139 373 145 360L146 202Z"/>
 <path d={female?"M91 118Q120 103 149 118L157 208Q120 223 83 208Z":"M84 116Q120 106 156 116L150 213H90Z"} fill="#f7f0e5"/>
 <path d="M90 124L67 221Q61 233 55 224L72 121Z M150 124L173 221Q179 233 185 224L168 121Z"/>
 <path d="M109 99V120Q120 130 131 120V99"/>
 <path d={female?"M86 67Q84 23 120 24Q157 23 154 69L161 116L143 121L98 117L79 111Z":"M87 65Q85 26 120 26Q153 27 154 65Z"} fill="#76553d"/>
 <ellipse cx="120" cy="77" rx="30" ry="35"/>
 <path d={female?"M90 66Q97 33 124 40Q133 55 150 61L147 44Q120 20 94 43Z":"M89 62L94 39L122 31L149 44L151 59L127 47L111 54Z"} fill="#76553d"/>
 <path d="M107 78v3 M133 78v3 M115 94q5 4 10 0" fill="none" strokeLinecap="round"/>
 </g>
 {layers.map(l=>{const i=items.find(i=>i.category===l.cat);if(!i)return null;
 const garment=<GarmentShape category={i.category} fill={colorHex(i.colors[0]||'米色')} accent={i.colors[1]?colorHex(i.colors[1]):undefined}/>;
 return <g key={l.cat}><title>{i.name} · 分类与配色示意</title><svg x={l.x} y={l.y} width={l.cat==="shoes"?34:l.w} height={l.h} viewBox={l.box} preserveAspectRatio="none">{garment}</svg>{l.cat==="shoes" && <svg x={122} y={l.y} width={34} height={l.h} viewBox={l.box} preserveAspectRatio="none">{garment}</svg>}</g>;})}
 </svg><p className="text-center text-[11px] text-cocoa/75">统一卡通人偶 · 展示单品分类与配色</p><p className="mt-1 text-center text-[10px] text-cocoa/65">款式、图案以单品图片为准；不代表真实上身或尺码效果。</p></div>;
}
