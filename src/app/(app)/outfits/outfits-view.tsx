"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Bot, Cpu, Info, Lightbulb, Loader2, RefreshCw, Sparkles, Trash2, Wand2 } from "lucide-react";
import clsx from "clsx";
import { SEASONS, STYLES, styleLabel, type Item, type Outfit, type Season, type StyleId } from "@/lib/constants";
import { api, errMsg } from "@/lib/client";
import { EmptyState, PageHeader } from "@/components/ui";
import { useToast } from "@/components/toast";
import { OutfitDoll } from "@/components/outfit-doll";

type Generated = { title: string; itemIds: string[]; reasoning: string; tips: string; source: "ai" | "rule" };

const OCCASIONS = ["日常", "上班", "约会", "聚会", "旅行", "运动", "面试", "居家"];

function currentSeason(): Season {
  const m = new Date().getMonth() + 1;
  return m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
}

export function OutfitsView({ items, initialSaved, hasLlm, hasBody }: { items: Item[]; initialSaved: Outfit[]; hasLlm: boolean; hasBody: boolean }) {
  const toast = useToast();
  const [doll,setDoll]=useState<"female"|"male">("female");
  const [style, setStyle] = useState<StyleId>("minimal");
  const [season, setSeason] = useState<Season>(currentSeason);
  const [occasion, setOccasion] = useState("日常");
  const [weather, setWeather] = useState("");
  const [mode, setMode] = useState<"auto" | "rule">("auto");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Generated[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"create" | "saved">("create");

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  async function generate() {
    setLoading(true);
    setNotice(null);
    try {
      const r = await api<{ outfits: Generated[]; notice: string | null }>("/api/outfits/generate", {
        method: "POST",
        json: { style, season, occasion, weather: weather || undefined, mode, count: 3 },
      });
      setResults(r.outfits);
      setNotice(r.notice);
      setSavedKeys(new Set());
      if (!r.outfits.length) toast("没有找到合适的组合，试试换个风格或补充单品", "info");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }

  async function save(o: Generated, key: string) {
    try {
      const { outfit } = await api<{ outfit: Outfit }>("/api/outfits", {
        method: "POST",
        json: { title: o.title, style, occasion, itemIds: o.itemIds, reasoning: o.reasoning, tips: o.tips, source: o.source },
      });
      setSaved((s) => [outfit, ...s]);
      setSavedKeys((s) => new Set(s).add(key));
      toast("已收藏到穿搭本", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/outfits/${id}`, { method: "DELETE" });
      setSaved((s) => s.filter((o) => o.id !== id));
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="智能搭配" />
        <EmptyState icon={Sparkles} title="先往衣柜里放点衣服" desc="至少需要一件上装 + 一件下装（或一条连衣裙），AI 才能开始搭配。" action={<Link href="/wardrobe" className="btn-primary">去添加单品</Link>} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="智能搭配"
        subtitle="选一个风格，从你的衣柜里组合整套造型"
        action={
          <div role="tablist" aria-label="视图" className="flex rounded-2xl bg-cocoa/5 p-1">
            {(["create", "saved"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={clsx("rounded-xl px-4 py-1.5 text-sm", view === v ? "bg-cocoa/10" : "text-cocoa/75")}>
                {v === "create" ? "生成" : `穿搭本 ${saved.length}`}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-5 flex items-center gap-2" role="group" aria-label="固定人偶款式"><span className="text-sm">搭配人偶</span>{(["female","male"] as const).map(m=><button key={m} className={clsx("chip",doll===m&&"chip-on")} aria-pressed={doll===m} onClick={()=>setDoll(m)}>{m==="female"?"女款人偶":"男款人偶"}</button>)}</div>
      {view === "create" ? (
        <>
          <section className="glass mb-8 space-y-5 p-5 sm:p-6" aria-label="搭配条件">
            <div>
              <h2 className="label">风格</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9" role="group" aria-label="风格">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    aria-pressed={style === s.id}
                    onClick={() => setStyle(s.id)}
                    className={clsx(
                      "group relative overflow-hidden rounded-2xl border p-3 text-left transition",
                      style === s.id ? "border-neon-violet/70 bg-cocoa/10 shadow-[0_0_24px_-8px_rgb(155_107_255/0.9)]" : "border-cocoa/10 bg-cocoa/[0.03] hover:bg-cocoa/[0.07]",
                    )}
                    title={s.desc}
                  >
                    <span className={`mb-2 block h-1.5 w-8 rounded-full bg-gradient-to-r ${s.hue}`} aria-hidden />
                    <span className="text-sm font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-cocoa/75">{STYLES.find((s) => s.id === style)?.desc}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <h2 className="label">季节</h2>
                <div className="flex gap-2" role="group" aria-label="季节">
                  {SEASONS.map((s) => (
                    <button key={s.id} aria-pressed={season === s.id} onClick={() => setSeason(s.id)} className={clsx("chip flex-1 justify-center", season === s.id && "chip-on")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="occasion" className="label">场合</label>
                <select id="occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} className="input">
                  {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="weather" className="label">天气（可选）</label>
                <input id="weather" value={weather} onChange={(e) => setWeather(e.target.value)} maxLength={40} placeholder="如：18°C 小雨" className="input" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-cocoa/5 pt-5">
              <div className="flex rounded-2xl bg-cocoa/5 p-1 text-xs" role="radiogroup" aria-label="搭配引擎">
                <button role="radio" aria-checked={mode === "auto"} onClick={() => setMode("auto")} className={clsx("flex items-center gap-1.5 rounded-xl px-3 py-1.5", mode === "auto" ? "bg-cocoa/10" : "text-cocoa/75")}>
                  <Bot className="size-3.5" aria-hidden /> AI 造型师
                </button>
                <button role="radio" aria-checked={mode === "rule"} onClick={() => setMode("rule")} className={clsx("flex items-center gap-1.5 rounded-xl px-3 py-1.5", mode === "rule" ? "bg-cocoa/10" : "text-cocoa/75")}>
                  <Cpu className="size-3.5" aria-hidden /> 内置算法
                </button>
              </div>
              {!hasLlm && mode === "auto" && <Link href="/settings" className="text-xs text-amber-300 underline">未配置大模型，将使用内置算法</Link>}
              {!hasBody && <Link href="/body" className="text-xs text-cocoa/75 underline">补充身材信息，搭配更贴合</Link>}
              <button onClick={generate} disabled={loading} className="btn-primary ml-auto px-6">
                {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : results ? <RefreshCw className="size-4" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
                {loading ? "造型师思考中…" : results ? "换一批" : "生成穿搭"}
              </button>
            </div>
          </section>

          {notice && (
            <p className="mb-5 flex items-start gap-2 rounded-2xl border border-cocoa/10 bg-cocoa/5 px-4 py-3 text-sm text-cocoa/65">
              <Info className="mt-0.5 size-4 shrink-0 text-neon-cyan" aria-hidden /> {notice}
            </p>
          )}

          {loading && !results && (
            <div className="grid gap-5 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-96" />)}
            </div>
          )}

          {results && (
            <div className={clsx("grid gap-5 lg:grid-cols-3", loading && "opacity-50")} aria-busy={loading}>
              {results.map((o, idx) => {
                const key = `${idx}-${o.itemIds.join()}`;
                return (
                  <OutfitCard model={doll} key={key} title={o.title} items={o.itemIds.map((id) => byId.get(id)).filter(Boolean) as Item[]} reasoning={o.reasoning} tips={o.tips} source={o.source} delay={idx * 80}>
                    <button onClick={() => save(o, key)} disabled={savedKeys.has(key)} className="btn-ghost w-full">
                      {savedKeys.has(key) ? <BookmarkCheck className="size-4 text-neon-cyan" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
                      {savedKeys.has(key) ? "已收藏" : "收藏这套"}
                    </button>
                  </OutfitCard>
                );
              })}
            </div>
          )}
        </>
      ) : saved.length === 0 ? (
        <EmptyState icon={Bookmark} title="穿搭本是空的" desc="生成满意的搭配后点「收藏这套」，就会保存在这里。" />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((o, idx) => (
            <OutfitCard
              model={doll}
              key={o.id}
              title={o.title}
              subtitle={`${styleLabel(o.style)}${o.occasion ? ` · ${o.occasion}` : ""} · ${new Date(o.createdAt).toLocaleDateString("zh-CN")}`}
              items={o.itemIds.map((id) => byId.get(id)).filter(Boolean) as Item[]}
              reasoning={o.reasoning}
              tips={o.tips}
              source={o.source}
              delay={Math.min(idx, 9) * 40}
            >
              <button onClick={() => remove(o.id)} className="btn-ghost w-full text-cocoa/75">
                <Trash2 className="size-4" aria-hidden /> 移除
              </button>
            </OutfitCard>
          ))}
        </div>
      )}
    </>
  );
}

function OutfitCard({
  title, subtitle, items, reasoning, tips, source, children, delay = 0, model,
}: {
  model: "female"|"male"; title: string; subtitle?: string; items: Item[]; reasoning?: string | null; tips?: string | null; source: "ai" | "rule"; children?: React.ReactNode; delay?: number;
}) {
  return (
    <article className="glass flex animate-fade-up flex-col overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-2 p-5 pb-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-cocoa/75">{subtitle}</p>}
        </div>
        <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-[10px]", source === "ai" ? "bg-neon-violet/20 text-neon-violet" : "bg-cocoa/10 text-cocoa/75")}>
          {source === "ai" ? "AI" : "算法"}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 text-sm text-cocoa/75">这套搭配里的单品已被删除</p>
      ) : (
        <OutfitDoll items={items} model={model}/>
      )}
      <ul className="mt-3 flex flex-wrap gap-1.5 px-5">
        {items.map((i) => <li key={i.id} className="rounded-full bg-cocoa/5 px-2 py-0.5 text-[11px] text-cocoa/75">{i.name}</li>)}
      </ul>
      <div className="mt-auto space-y-3 p-5">
        {reasoning && <p className="text-sm leading-relaxed text-cocoa/70">{reasoning}</p>}
        {tips && (
          <p className="flex gap-2 rounded-2xl bg-neon-cyan/5 p-3 text-xs leading-relaxed text-neon-cyan/90">
            <Lightbulb className="size-4 shrink-0" aria-hidden /> {tips}
          </p>
        )}
        {children}
      </div>
    </article>
  );
}
