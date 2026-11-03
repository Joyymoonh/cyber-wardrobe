"use client";
/* eslint-disable @next/next/no-img-element -- authenticated private images */
import { useState } from "react";
import { Heart, PencilLine, Trash2 } from "lucide-react";
import { categoryLabel, type Item } from "@/lib/constants";
import { displayImageKey } from "@/lib/item-images";
import { api, errMsg, imageUrl } from "@/lib/client";
import { Modal } from "@/components/ui";
import { GarmentArt } from "@/components/art";
import { useToast } from "@/components/toast";
import { ItemForm, draftToPayload, itemToDraft } from "./item-form";
export function ItemEditor(props: { item: Item | null; onClose: () => void; onSaved: (i:Item)=>void; onDeleted:(id:string)=>void }) {
 return <Modal open={!!props.item} onClose={()=>document.getElementById("edit-close-guard")?.click()} title="衣物小档案" wide>{props.item && <Editor key={props.item.id} {...props} item={props.item}/>}</Modal>;
}
function Editor({item,onClose,onSaved,onDeleted}:{item:Item;onClose:()=>void;onSaved:(i:Item)=>void;onDeleted:(id:string)=>void}) {
 const toast=useToast();const [editing,setEditing]=useState(false);const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);
 const [discard,setDiscard]=useState(false);const [confirmDelete,setConfirmDelete]=useState(false);
 const src=imageUrl(displayImageKey(item));
 function close(){if(dirty){setDiscard(true);return;}onClose();}
 async function del(){if(busy)return;setBusy(true);try{await api(`/api/items/${item.id}`,{method:"DELETE"});onDeleted(item.id);}catch(e){toast(errMsg(e),"error");}finally{setBusy(false);}}
 async function favorite(){if(busy)return;setBusy(true);try{const r=await api<{item:Item}>(`/api/items/${item.id}`,{method:"PUT",json:draftToPayload({...itemToDraft(item),favorite:!item.favorite})});onSaved(r.item);}catch(e){toast(errMsg(e),"error");}finally{setBusy(false);}}
 return <><button id="edit-close-guard" className="hidden" onClick={close}/>{editing ? <ItemForm initial={itemToDraft(item)} onDirtyChange={setDirty} submitLabel="保存修改" onSubmit={async d=>{const r=await api<{item:Item}>(`/api/items/${item.id}`,{method:"PUT",json:draftToPayload(d)});onSaved(r.item);}}/> : <div className="grid gap-6 sm:grid-cols-2"><div className="rounded-3xl bg-[#f5eddf] p-6">{src ? <img src={src} alt={item.name} className="aspect-[4/5] w-full object-contain"/> : <GarmentArt category={item.category} colors={item.colors} className="w-full"/>}</div><div className="space-y-4"><span className="chip">{categoryLabel(item.category)}</span><h3 className="text-2xl font-bold">{item.name}</h3><p>{item.colors.join(" · ") || "未填写颜色"}</p><p className="text-sm text-cocoa/75">{[item.brand,item.material,item.price ? `¥${item.price}` : ""].filter(Boolean).join(" · ")}</p><p className="whitespace-pre-wrap text-sm">{item.notes}</p>{(item.cutoutImage || item.cartoonImage) && <p className="text-xs text-cocoa/75">原图、真实提取图与卡通图独立保留，可在编辑中切换展示。</p>}<div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={()=>setEditing(true)}><PencilLine className="size-4"/>编辑</button><button className="btn-ghost" disabled={busy} onClick={favorite}><Heart className="size-4"/>{item.favorite ? "取消收藏":"收藏"}</button><button className="btn-danger" disabled={busy} onClick={()=>setConfirmDelete(true)}><Trash2 className="size-4"/>删除</button></div></div></div>}
 {discard && <div role="alert" className="sticky bottom-0 mt-4 rounded-2xl border-2 border-[#c99f7a] bg-paper p-4"><p>修改还没有保存。</p><div className="mt-3 flex gap-2"><button className="btn-primary" onClick={()=>setDiscard(false)}>继续编辑</button><button className="btn-ghost" onClick={onClose}>放弃并关闭</button></div></div>}
 {confirmDelete && <div role="alert" className="mt-4 rounded-2xl border-2 border-red-400/30 bg-paper p-4"><p>确定删除「{item.name}」吗？</p><div className="mt-3 flex gap-2"><button className="btn-ghost" disabled={busy} onClick={()=>setConfirmDelete(false)}>保留衣物</button><button className="btn-danger" disabled={busy} onClick={del}>确认删除</button></div></div>}
 </>;
}
