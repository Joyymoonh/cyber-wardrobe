"use client";

import { GarmentImageWorkbench } from "@/components/garment-image-workbench";
import { useRef, useState, useEffect } from "react";
import { Heart, ImagePlus, Loader2, Wand2 } from "lucide-react";
import clsx from "clsx";
import { CATEGORIES, COLORS, SEASONS, STYLES, type Category, type Item, type Season, type StyleId } from "@/lib/constants";
import { api, errMsg, imageUrl, uploadImage } from "@/lib/client";
import { ChipGroup } from "@/components/ui";
import { useToast } from "@/components/toast";

export type ItemDraft = {
  name: string;
  category: Category | "";
  colors: string[];
  styles: StyleId[];
  seasons: Season[];
  material?: string | null;
  brand?: string | null;
  price?: number | null;
  image?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  cartoonImage?: string | null;
  cutoutImage?: string | null;
  imageMode?: "original" | "cutout" | "cartoon";
  favorite?: boolean;
};

export const emptyDraft = (): ItemDraft => ({ name: "", category: "", colors: [], styles: [], seasons: [] });

type Recognized = Pick<ItemDraft, "name" | "category" | "colors" | "styles" | "seasons" | "material" | "brand">;

/** Shared create/edit form. `onSubmit` receives a validated draft. */
export function ItemForm({
  initial, submitLabel, onSubmit, extraActions, autoRecognize, onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  initial: ItemDraft;
  submitLabel: string;
  onSubmit: (d: ItemDraft) => Promise<void>;
  extraActions?: React.ReactNode;
  /** Run AI recognition right after a new photo is uploaded. */
  autoRecognize?: boolean;
}) {
  const toast = useToast();
  const [d, setD] = useState<ItemDraft>(initial);
  const [uploading, setUploading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const alive = useRef(true);
  const sequence = useRef(0);
  const busy = useRef(false);
  const edited = useRef(new Set<string>());
  const [failure, setFailure] = useState("");
  const [processing, setProcessing] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { onDirtyChange?.(JSON.stringify(d) !== JSON.stringify(initial)); }, [d, initial, onDirtyChange]);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => { edited.current.add(k); setD((x) => ({ ...x, [k]: v, ...(k === "category" && v !== x.category ? { cutoutImage: null, cartoonImage: null, imageMode: "original" as const } : {}) })); };

  async function recognize(image: string) {
    if (busy.current) return;
    const ticket = ++sequence.current;
    const snapshot = new Set(edited.current);
    setRecognizing(true); setFailure(""); busy.current = true;
    try {
      const { recognized } = await api<{ recognized: Recognized }>("/api/import/recognize", { method: "POST", json: { image, title: d.name || undefined } });
      if (!alive.current || sequence.current !== ticket) return;
      setD(x => {
        const next = { ...x };
        for (const key of Object.keys(recognized) as (keyof Recognized)[]) {
          if (edited.current.has(key) && !snapshot.has(key)) continue;
          // Never replace fields the user has explicitly edited, even before this request.
          if (edited.current.has(key)) continue;
          const value = recognized[key];
          if (value && (!Array.isArray(value) || value.length)) Object.assign(next, { [key]: value });
        }
        return next;
      });
      toast("识别好了，请核对款式和颜色", "success");
    } catch (e) { if (alive.current) setFailure(errMsg(e)); }
    finally { if (alive.current && ticket === sequence.current) setRecognizing(false); busy.current = false; }
  }

  async function onFile(file?: File) {
    if (!file || busy.current) return;
    const ticket = ++sequence.current;
    busy.current = true; setUploading(true); setFailure("");
    let key: string | undefined;
    try {
      key = await uploadImage(file);
      if (!alive.current || sequence.current !== ticket) return;
      setD(x=>({...x,image:key,cutoutImage:null,cartoonImage:null,imageMode:"original"}));
    } catch (e) { if (alive.current) setFailure(errMsg(e)); }
    finally { busy.current = false; if (alive.current) setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
    if (key && autoRecognize && alive.current && sequence.current === ticket) void recognize(key);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    if (!d.category) return toast("请选择衣物分类", "error");
    if (!d.name.trim()) return toast("给单品起个名字吧", "error");
    busy.current = true; setSaving(true);
    try {
      await onSubmit(d);
    } catch (err) {
      toast(errMsg(err), "error");
    } finally {
      busy.current = false; if (alive.current) setSaving(false);
    }
  }

  const src = imageUrl(d.image);

  return (
    <form onSubmit={submit} className="grid gap-6 sm:grid-cols-[220px_1fr]">
      <div className="space-y-3">
        <button
          type="button"
          disabled={uploading || recognizing || saving || processing}
          onClick={() => fileRef.current?.click()}
          className="group relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-cocoa/15 bg-ink-800 transition hover:border-neon-violet/50"
          aria-label={src ? "更换图片" : "上传图片"}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="单品图片" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-cocoa/75">
              <ImagePlus className="size-8" aria-hidden />
              拍照或选择图片
            </span>
          )}
          {(uploading || recognizing) && (
            <span className="absolute inset-0 grid place-items-center bg-paper/90 text-sm">
              <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden />{uploading ? "上传中" : "AI 识别中"}</span>
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} tabIndex={-1} aria-hidden />
        {d.image && (
          <button type="button" className="btn-ghost w-full" disabled={recognizing || uploading || saving || processing} onClick={() => recognize(d.image!)}>
            <Wand2 className="size-4" aria-hidden /> AI 识别属性
          </button>
        )}
        <GarmentImageWorkbench key={`${d.image}:${d.category}`} draft={d} disabled={recognizing || uploading || saving} onBusy={value=>{busy.current=value;setProcessing(value);}} onChange={patch=>setD(x=>({...x,...patch}))}/>
        {failure && <p role="alert" className="rounded-xl bg-[#fbe4df] p-3 text-sm">{failure}<span className="mt-1 block text-xs">可以重试上面的操作，或手动补全后保存。</span></p>}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="item-name" className="label">名称</label>
            <input id="item-name" className="input" value={d.name} maxLength={60} onChange={(e) => set("name", e.target.value)} placeholder="如：白色牛津纺衬衫" />
          </div>
          <button
            type="button"
            aria-pressed={!!d.favorite}
            onClick={() => set("favorite", !d.favorite)}
            className={clsx("btn-ghost mt-6 self-start", d.favorite && "text-neon-pink")}
            aria-label="收藏"
          >
            <Heart className={clsx("size-4", d.favorite && "fill-current")} aria-hidden />
          </button>
        </div>

        <fieldset disabled={processing || uploading || recognizing || saving}>
          <legend className="label">分类{!d.category && " · 待确认"}</legend>
          <ChipGroup label="分类" multiple={false} options={CATEGORIES} value={d.category ? [d.category] : []} onChange={(v) => v[0] && set("category", v[0])} />
        </fieldset>

        <fieldset>
          <legend className="label">颜色（最多 4 个，主色在前）</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="颜色">
            {COLORS.map((c) => {
              const on = d.colors.includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("colors", on ? d.colors.filter((x) => x !== c.name) : [...d.colors, c.name].slice(0, 4))}
                  className={clsx("chip", on && "chip-on")}
                >
                  <span className="size-3 rounded-full ring-1 ring-cocoa/25" style={{ background: c.hex }} aria-hidden />
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <details className="rounded-2xl border border-cocoa/15 p-3"><summary className="text-sm font-semibold">更多信息 · 风格、季节、品牌…</summary><div className="mt-4 space-y-4">
        <fieldset>
          <legend className="label">风格</legend>
          <ChipGroup label="风格" options={STYLES} value={d.styles} onChange={(v) => set("styles", v.slice(0, 5))} />
        </fieldset>

        <fieldset>
          <legend className="label">季节</legend>
          <ChipGroup label="季节" options={SEASONS} value={d.seasons} onChange={(v) => set("seasons", v)} />
        </fieldset>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="item-material" className="label">材质</label>
            <input id="item-material" className="input" value={d.material ?? ""} maxLength={40} onChange={(e) => set("material", e.target.value)} placeholder="棉" />
          </div>
          <div>
            <label htmlFor="item-brand" className="label">品牌</label>
            <input id="item-brand" className="input" value={d.brand ?? ""} maxLength={40} onChange={(e) => set("brand", e.target.value)} placeholder="可选" />
          </div>
          <div>
            <label htmlFor="item-price" className="label">价格 ¥</label>
            <input
              id="item-price"
              className="input"
              inputMode="decimal"
              value={d.price ?? ""}
              onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value) || 0)}
              placeholder="可选"
            />
          </div>
        </div>

        <div>
          <label htmlFor="item-notes" className="label">备注</label>
          <textarea id="item-notes" className="input min-h-16 resize-y" maxLength={500} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="尺码、购买时间、搭配心得…" />
        </div>

        {d.sourceUrl && (
          <p className="truncate text-xs text-cocoa/75">
            来源：<a href={d.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-neon-cyan hover:underline">{d.sourceUrl}</a>
          </p>
        )}

        </div></details>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {extraActions}
          <button type="submit" className="btn-primary min-w-28" disabled={saving || uploading || recognizing || processing}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

export function draftToPayload(d: ItemDraft) {
  return {
    ...d,
    name: d.name.trim(),
    material: d.material || null,
    brand: d.brand || null,
    notes: d.notes || null,
    sourceUrl: d.sourceUrl || null,
    favorite: !!d.favorite,
  };
}

export const itemToDraft = (i: Item): ItemDraft => ({ ...i });
