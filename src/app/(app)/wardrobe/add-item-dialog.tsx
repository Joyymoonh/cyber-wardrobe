"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, PencilLine, Check } from "lucide-react";
import type { Item } from "@/lib/constants";
import { api } from "@/lib/client";
import { Modal } from "@/components/ui";
import { Robot } from "@/components/art";
import { ItemForm, draftToPayload, emptyDraft, type ItemDraft } from "./item-form";

type Tab = "photo" | "manual";
export function AddItemDialog({ open, onClose, onCreated, hasLlm }: { open: boolean; onClose: () => void; onCreated: (i: Item) => void; hasLlm: boolean }) {
  // Unmount the session on close: drafts and late requests cannot leak into a new session.
  return <Modal open={open} onClose={() => document.getElementById("add-close-guard")?.click()} title="给衣柜添一件" wide>{open && <AddSession onClose={onClose} onCreated={onCreated} hasLlm={hasLlm} />}</Modal>;
}
function AddSession({ onClose, onCreated, hasLlm }: Omit<Parameters<typeof AddItemDialog>[0],"open">) {
  const [tab,setTab] = useState<Tab | null>(null);
  const [draft,setDraft] = useState<ItemDraft | null>(null);
  const [dirty,setDirty] = useState(false);
  const [discard,setDiscard] = useState(false);
  const [created,setCreated] = useState<Item | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current=true; return () => { alive.current=false; }; },[]);
  function close() { if (dirty && !created) { setDiscard(true); return; } onClose(); }
  async function create(d:ItemDraft) { const {item}=await api<{item:Item}>("/api/items",{method:"POST",json:draftToPayload(d)}); onCreated(item); if(alive.current){setCreated(item);setDirty(false);} }
  return <><button id="add-close-guard" className="hidden" onClick={close} />
    <ol className="mb-6 flex gap-3 text-xs text-cocoa/75"><li>① 选择来源</li><li>→ ② 预览与核对</li><li>→ ③ 放进衣柜</li></ol>
    {created ? <div className="py-8 text-center"><Robot className="mx-auto h-36" holding="heart"/><h3 className="mt-4 text-xl font-bold"><Check className="mr-2 inline size-5"/>已放好「{created.name}」</h3><div className="mt-6 flex flex-wrap justify-center gap-3"><button className="btn-primary" onClick={()=>{setCreated(null);setDraft(null);setTab(null);}}>继续添加</button><Link className="btn-ghost" href="/outfits">去搭配</Link><button className="btn-ghost" onClick={onClose}>看看衣柜</button></div></div> : <>
    {!tab ? <div className="grid gap-4 sm:grid-cols-2">{([{id:"photo",label:"拍照 / 上传",desc:"把喜欢的衣服拍下来",icon:Camera},{id:"manual",label:"自己填写",desc:"从名称和分类开始",icon:PencilLine}] as const).map(t=><button key={t.id} className="glass p-6 text-left transition hover:-translate-y-1" onClick={()=>{setTab(t.id);setDraft(emptyDraft());}}><t.icon className="mb-5 size-8 text-neon-cyan"/><strong className="block">{t.label}</strong><span className="mt-2 block text-xs text-cocoa/75">{t.desc}</span></button>)}</div> : <>
    <button className="mb-4 text-sm underline"  onClick={()=>{if(dirty && !window.confirm("切换来源会放弃当前草稿，继续吗？"))return;setTab(null);setDraft(null);setDirty(false);}}>← 换一种添加方式</button>
    {draft && <ItemForm key={tab} initial={draft} onDirtyChange={setDirty} submitLabel="确认，放进衣柜" onSubmit={create} autoRecognize={hasLlm && tab!=="manual"}/>}
    {!hasLlm && draft && <p className="mt-4 text-xs text-cocoa/75">可以直接手动填写。需要自动识别时，去<Link href="/settings" className="underline">设置</Link>接入模型。</p>}
    </>}
    </>}
    {discard && <div role="alert" className="sticky bottom-0 mt-5 rounded-2xl border-2 border-[#c99f7a] bg-paper p-4 shadow-lg"><p className="text-sm font-semibold">还没放进衣柜，要保留这份草稿吗？</p><div className="mt-3 flex gap-2"><button className="btn-primary" onClick={()=>setDiscard(false)}>继续填写</button><button className="btn-ghost" onClick={onClose}>放弃并关闭</button></div></div>}
  </>;
}
