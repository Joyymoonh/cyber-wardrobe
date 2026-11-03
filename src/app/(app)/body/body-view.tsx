"use client";

import { useMemo, useState } from "react";
import { Loader2, Ruler, ScanLine } from "lucide-react";
import clsx from "clsx";
import { BODY_SHAPES, type BodyProfile, type BodyShape } from "@/lib/constants";
import { classifyShape } from "@/lib/body";
import { api, errMsg } from "@/lib/client";
import { PageHeader } from "@/components/ui";
import { useToast } from "@/components/toast";
import { BodyScanner } from "./body-scanner";

const FIELDS: { key: keyof BodyProfile; label: string; unit: string }[] = [
  { key: "heightCm", label: "身高", unit: "cm" },
  { key: "weightKg", label: "体重", unit: "kg" },
  { key: "shoulderCm", label: "肩宽", unit: "cm" },
  { key: "bustCm", label: "胸围", unit: "cm" },
  { key: "waistCm", label: "腰围", unit: "cm" },
  { key: "hipCm", label: "臀围", unit: "cm" },
  { key: "inseamCm", label: "腿长（内侧）", unit: "cm" },
];

export function BodyView({ initial }: { initial: BodyProfile | null }) {
  const toast = useToast();
  const [p, setP] = useState<BodyProfile>(initial ?? {});
  const [manualShape, setManualShape] = useState<BodyShape | undefined>(initial?.shape);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"scan" | "manual">(initial?.scan ? "manual" : "scan");

  const autoShape = useMemo(() => classifyShape(p), [p]);
  const shape = manualShape ?? autoShape;
  const shapeInfo = BODY_SHAPES.find((s) => s.id === shape);
  const bmi = p.heightCm && p.weightKg ? p.weightKg / (p.heightCm / 100) ** 2 : null;

  async function save() {
    setSaving(true);
    try {
      const { body } = await api<{ body: BodyProfile }>("/api/body", { method: "PUT", json: { ...p, shape: manualShape ?? null } });
      setP(body);
      toast("身材档案已保存，搭配时会参考它", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="身材档案" subtitle="扫描或填写身材数据，让搭配扬长避短" />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="glass p-5 sm:p-6">
          <div role="tablist" aria-label="录入方式" className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-cocoa/5 p-1">
            {[{ id: "scan", label: "照片扫描", icon: ScanLine }, { id: "manual", label: "手动填写", icon: Ruler }].map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id as "scan" | "manual")} className={clsx("flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm", tab === t.id ? "bg-cocoa/10" : "text-cocoa/75")}>
                <t.icon className="size-4" aria-hidden /> {t.label}
              </button>
            ))}
          </div>

          {tab === "scan" ? (
            <BodyScanner
              onResult={(r) => {
                setP((x) => ({ ...x, scan: { ...r, scannedAt: Date.now() } }));
                toast("扫描完成，可以在「手动填写」里补充尺寸后保存", "success");
              }}
            />
          ) : (
            <div className="space-y-5">
              <fieldset>
                <legend className="label">性别</legend>
                <div className="flex gap-2">
                  {([["female", "女"], ["male", "男"], ["other", "不透露"]] as const).map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={p.gender === v} onClick={() => setP({ ...p, gender: v })} className={clsx("chip flex-1 justify-center", p.gender === v && "chip-on")}>{l}</button>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={f.key} className="label">{f.label}</label>
                    <div className="relative">
                      <input
                        id={f.key}
                        inputMode="decimal"
                        className="input pr-10"
                        value={(p[f.key] as number | undefined) ?? ""}
                        onChange={(e) => setP({ ...p, [f.key]: e.target.value === "" ? undefined : Number(e.target.value) || undefined })}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-cocoa/35">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <fieldset>
                <legend className="label">肤色冷暖</legend>
                <div className="flex gap-2">
                  {([["cool", "冷调"], ["neutral", "中性"], ["warm", "暖调"]] as const).map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={p.skinTone === v} onClick={() => setP({ ...p, skinTone: v })} className={clsx("chip flex-1 justify-center", p.skinTone === v && "chip-on")}>{l}</button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="glass relative overflow-hidden p-6">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-neon-violet/25 blur-3xl" aria-hidden />
            <h2 className="label">你的体型</h2>
            <p className="font-display text-3xl font-bold"><span className="neon-text">{shapeInfo?.label ?? "待分析"}</span></p>
            <p className="mt-2 text-sm leading-relaxed text-cocoa/75">{shapeInfo?.tip ?? "扫描一张全身照，或填写胸围/腰围/臀围后自动判断。"}</p>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Stat label="肩臀比" value={p.scan?.shoulderHipRatio?.toFixed(2)} />
              <Stat label="腿身比" value={p.scan?.legBodyRatio?.toFixed(2)} />
              <Stat label="BMI" value={bmi ? bmi.toFixed(1) : undefined} />
            </dl>
          </div>

          <div className="glass p-6">
            <h2 className="label">不准？手动指定体型</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="手动指定体型">
              <button aria-pressed={!manualShape} onClick={() => setManualShape(undefined)} className={clsx("chip", !manualShape && "chip-on")}>自动{autoShape ? `（${BODY_SHAPES.find((s) => s.id === autoShape)?.label}）` : ""}</button>
              {BODY_SHAPES.map((s) => (
                <button key={s.id} aria-pressed={manualShape === s.id} onClick={() => setManualShape(s.id)} className={clsx("chip", manualShape === s.id && "chip-on")}>{s.label}</button>
              ))}
            </div>
          </div>

          <button className="btn-primary w-full py-3" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />} 保存身材档案
          </button>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-cocoa/5 p-3">
      <dt className="text-[11px] text-cocoa/75">{label}</dt>
      <dd className="mt-1 font-display text-lg font-semibold">{value ?? "—"}</dd>
    </div>
  );
}
