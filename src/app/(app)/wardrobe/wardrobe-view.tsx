"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Heart, Plus, Search, Shirt } from "lucide-react";
import clsx from "clsx";
import { CATEGORIES, STYLES, categoryLabel, type Item } from "@/lib/constants";
import { GarmentArt, HeroWardrobe, WardrobeIllustration } from "@/components/art";
import { displayImageKey } from "@/lib/item-images";
import { imageUrl } from "@/lib/client";
import { EmptyState, PageHeader, Swatch } from "@/components/ui";
import { AddItemDialog } from "./add-item-dialog";
import { ItemEditor } from "./item-editor";

const subscribeView = (callback: () => void) => { window.addEventListener("closet-view", callback); window.addEventListener("storage", callback); return () => { window.removeEventListener("closet-view", callback); window.removeEventListener("storage", callback); }; };
const getView = () => { try { return localStorage.getItem("closet-view") || "cabinet"; } catch { return "cabinet"; } };

export function WardrobeView({ initialItems, hasLlm }: { initialItems: Item[]; hasLlm: boolean }) {
  const view = useSyncExternalStore(subscribeView, getView, () => "cabinet");
  const [newId, setNewId] = useState<string | null>(null);
  function changeView(value: string) { try { localStorage.setItem("closet-view", value); } catch {} window.dispatchEvent(new Event("closet-view")); }
  const [items, setItems] = useState(initialItems);
  const [cat, setCat] = useState<string>("all");
  const [style, setStyle] = useState<string>("all");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (cat === "all" || i.category === cat) &&
          (style === "all" || i.styles.includes(style as Item["styles"][number])) &&
          (!favOnly || i.favorite) &&
          (!q || `${i.name}${i.brand ?? ""}${i.colors.join("")}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [items, cat, style, q, favOnly],
  );
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, items.filter((i) => i.category === c.id).length])), [items]);

  const upsert = (item: Item) => setItems((list) => (list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [item, ...list]));
  const remove = (id: string) => setItems((list) => list.filter((i) => i.id !== id));

  return (
    <>
      <PageHeader
        title="我的衣柜"
        subtitle={`共 ${items.length} 件单品`}
        action={
          <button className="btn-primary" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> 添加单品
          </button>
        }
      />

      <div className="cozy-banner mb-6 flex items-center justify-between gap-4 p-5 sm:px-8"><div><p className="text-xs tracking-widest text-cocoa/75">A LITTLE ROOM FOR YOUR STYLE</p><h2 className="mt-2 text-xl font-bold sm:text-2xl">每一件喜欢，都有自己的位置</h2><p className="mt-2 text-sm text-cocoa/65">整理一点点，穿搭的灵感就多一点。</p></div><WardrobeIllustration className="hidden h-28 w-28 shrink-0 sm:block" /></div>
      <div className="mb-5 flex justify-end gap-2" role="group" aria-label="衣柜视图">{[["cabinet", "小小衣柜"], ["list", "单品列表"]].map(([id,label]) => <button key={id} className={clsx("chip",view === id && "chip-on")} aria-pressed={view === id} onClick={() => changeView(id)}>{label}</button>)}</div>
      {items.length === 0 ? (
        <div className="cabinet"><HeroWardrobe className="mx-auto h-64 w-full max-w-sm" />
        <EmptyState
          icon={Shirt}
          title="衣柜还是空的"
          desc="拍一张衣服照片，把第一件单品放进你的卡通衣柜吧。"
          action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden /> 添加第一件</button>}
        /></div>
      ) : (
        <>
          <div className="mb-5 space-y-3">
            <div className="flex gap-2">
              <label className="relative flex-1">
                <span className="sr-only">搜索单品</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cocoa/35" aria-hidden />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索名称、品牌、颜色" className="input pl-10" />
              </label>
              <button aria-pressed={favOnly} onClick={() => setFavOnly(!favOnly)} className={clsx("btn-ghost", favOnly && "border-neon-pink/50 text-neon-pink")} aria-label="只看收藏">
                <Heart className={clsx("size-4", favOnly && "fill-current")} aria-hidden />
              </button>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="按分类筛选">
              {[{ id: "all", label: "全部" }, ...CATEGORIES].map((c) => (
                <button key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className={clsx("chip shrink-0", cat === c.id && "chip-on")}>
                  {c.label}
                  <span className="text-cocoa/75">{c.id === "all" ? items.length : counts[c.id]}</span>
                </button>
              ))}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="按风格筛选">
              {[{ id: "all", label: "所有风格" }, ...STYLES].map((s) => (
                <button key={s.id} aria-pressed={style === s.id} onClick={() => setStyle(s.id)} className={clsx("chip shrink-0", style === s.id && "chip-on")}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-cocoa/75">没有符合条件的单品</p>
          ) : (
            view === "cabinet" ? <div className="cabinet"><div className="cabinet-title">我的小小衣柜</div>{[
              { name: "挂杆 · 今天想穿哪一件？", cats: ["top", "outer", "dress"], hanging: true },
              { name: "抽屉 · 裤装与半裙", cats: ["bottom"], hanging: false },
              { name: "置物架 · 鞋包与小心思", cats: ["shoes", "bag", "accessory"], hanging: false },
            ].map(section => { const garments = filtered.filter(i => section.cats.includes(i.category)); return <details key={section.name} open className={clsx("cabinet-section", section.hanging && "hanging")}><summary>{section.name}<span className="ml-2 text-xs opacity-50">{garments.length} 件</span></summary>{garments.length ? <ul className="cabinet-items">{garments.map(item => <li key={item.id} className={clsx(newId === item.id && "new-garment")}><ItemCard item={item} onClick={() => setEditing(item)} /></li>)}</ul> : <p className="p-8 text-center text-sm text-cocoa/75">空出一点位置，留给下一件喜欢的衣服。</p>}</details>; })}</div>
            : <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{filtered.map(item => <li key={item.id} className={clsx(newId === item.id && "new-garment")}><ItemCard item={item} onClick={() => setEditing(item)} /></li>)}</ul>
          )}
        </>
      )}

      <AddItemDialog open={adding} onClose={() => setAdding(false)} hasLlm={hasLlm} onCreated={(i) => { upsert(i); setNewId(i.id); setQ(""); setCat("all"); setStyle("all"); setFavOnly(false); }} />
      <ItemEditor item={editing} onClose={() => setEditing(null)} onSaved={(i) => { upsert(i); setEditing(null); }} onDeleted={(id) => { remove(id); setEditing(null); }} />
    </>
  );
}

export function ItemCard({ item, onClick, compact }: { item: Item; onClick?: () => void; compact?: boolean }) {
  const src = imageUrl(displayImageKey(item));
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className="garment-card group block w-full overflow-hidden rounded-2xl text-left transition hover:-translate-y-0.5 hover:border-neon-violet/40 focus-visible:outline-2 focus-visible:outline-neon-cyan"
    >
      <div className="relative aspect-[4/5] rounded-t-2xl bg-[#f5eddf]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- private per-user images served by our API
          <img src={src} alt={item.name} loading="lazy" className="size-full object-contain p-3 transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center text-cocoa/20">
            <GarmentArt category={item.category} colors={item.colors} className="h-full w-[85%]" />
          </div>
        )}
        {item.favorite && <Heart className="absolute right-2.5 top-2.5 size-4 fill-neon-pink text-neon-pink drop-shadow" aria-label="已收藏" />}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-paper/95 px-2 py-0.5 text-[10px] backdrop-blur">{categoryLabel(item.category)}</span>
      </div>
      {!compact && (
        <div className="space-y-1.5 p-3">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <div className="flex items-center gap-1">
            {item.colors.map((c) => <Swatch key={c} name={c} />)}
            {item.brand && <span className="ml-auto truncate text-[11px] text-cocoa/75">{item.brand}</span>}
          </div>
        </div>
      )}
    </Wrapper>
  );
}
