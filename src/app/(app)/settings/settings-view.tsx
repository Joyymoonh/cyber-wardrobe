"use client";

import { ImageSettings } from "@/components/image-settings";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Trash2, Zap } from "lucide-react";
import clsx from "clsx";
import { LLM_PROVIDERS, type LlmProvider } from "@/lib/constants";
import { api, errMsg } from "@/lib/client";
import { PageHeader } from "@/components/ui";
import { useToast } from "@/components/toast";

type Settings = { provider: LlmProvider; baseUrl: string; model: string; visionModel: string | null; hasKey: boolean; keyHint: string | null };

export function SettingsView({ initial, email }: { initial: Settings | null; email: string }) {
  const toast = useToast();
  const first = LLM_PROVIDERS[0].presets[1]; // DeepSeek is reachable from mainland China and cheap
  const [saved, setSaved] = useState(initial);
  const [provider, setProvider] = useState<LlmProvider>(initial?.provider ?? "openai");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? first.baseUrl);
  const [model, setModel] = useState(initial?.model ?? first.model);
  const [visionModel, setVisionModel] = useState(initial?.visionModel ?? first.visionModel);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const providerDef = LLM_PROVIDERS.find((p) => p.id === provider)!;

  function applyPreset(p: (typeof providerDef.presets)[number]) {
    setBaseUrl(p.baseUrl);
    setModel(p.model);
    setVisionModel(p.visionModel);
  }

  function switchProvider(id: LlmProvider) {
    setProvider(id);
    applyPreset(LLM_PROVIDERS.find((p) => p.id === id)!.presets[0]);
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const { settings } = await api<{ settings: Settings }>("/api/settings/llm", {
        method: "PUT",
        json: { provider, baseUrl, model, visionModel: visionModel || null, ...(apiKey ? { apiKey } : {}) },
      });
      setSaved(settings);
      setApiKey("");
      toast("模型配置已保存", "success");
      return true;
    } catch (err) {
      toast(errMsg(err), "error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (!(await save())) return;
    setTesting(true);
    try {
      const r = await api<{ reply: string; ms: number }>("/api/settings/llm/test", { method: "POST" });
      setTestResult(`连接成功（${r.ms}ms）：${r.reply}`);
    } catch (err) {
      setTestResult(null);
      toast(errMsg(err), "error");
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    await api("/api/settings/llm", { method: "DELETE" }).catch(() => {});
    setSaved(null);
    setTestResult(null);
    toast("已移除模型配置，将使用内置算法", "info");
  }

  return (
    <>
      <PageHeader title="设置" subtitle={email} />
      <form onSubmit={save} className="glass max-w-3xl space-y-6 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-neon-violet/30 to-neon-cyan/20">
            <KeyRound className="size-5 text-neon-cyan" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">大模型接入</h2>
            <p className="text-sm text-cocoa/75">用于识别衣物属性和生成穿搭。自带 API Key，免费或付费模型都可以。</p>
          </div>
          {saved && <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" aria-hidden />已配置</span>}
        </div>

        <fieldset>
          <legend className="label">接口类型</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {LLM_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={provider === p.id}
                onClick={() => switchProvider(p.id)}
                className={clsx("rounded-2xl border p-4 text-left transition", provider === p.id ? "border-neon-violet/60 bg-neon-violet/10" : "border-cocoa/10 bg-cocoa/[0.03] hover:bg-cocoa/[0.06]")}
              >
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="mt-1 block text-xs text-cocoa/75">{p.desc}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {providerDef.presets.length > 1 && (
          <fieldset>
            <legend className="label">快速预设</legend>
            <div className="flex flex-wrap gap-2">
              {providerDef.presets.map((p) => (
                <button key={p.name} type="button" onClick={() => applyPreset(p)} className={clsx("chip", baseUrl === p.baseUrl && "chip-on")}>{p.name}</button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="baseUrl" className="label">Base URL</label>
            <input id="baseUrl" className="input font-mono" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" required />
          </div>
          <div>
            <label htmlFor="model" className="label">文本模型</label>
            <input id="model" className="input font-mono" value={model} onChange={(e) => setModel(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="visionModel" className="label">视觉模型（识别图片用，可选）</label>
            <input id="visionModel" className="input font-mono" value={visionModel ?? ""} onChange={(e) => setVisionModel(e.target.value)} placeholder="留空则用文本模型" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="apiKey" className="label">API Key {saved?.hasKey && <span className="text-emerald-700/80">· {saved.keyHint}，留空则不修改</span>}</label>
            <div className="relative">
              <input
                id="apiKey"
                type={showKey ? "text" : "password"}
                className="input pr-11 font-mono"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                placeholder={saved?.hasKey ? "••••••••••••" : "sk-..."}
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-cocoa/75 hover:text-cocoa" aria-label={showKey ? "隐藏" : "显示"}>
                {showKey ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </div>
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-cocoa/75">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Key 使用 AES-256-GCM 加密存储在服务器，只在服务端调用模型时解密，不会返回给浏览器。没有视觉能力的模型（如 DeepSeek）也能搭配，只是图片需要手动标注属性。
        </p>

        {testResult && <p role="status" className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-700">{testResult}</p>}

        <div className="flex flex-wrap gap-2 border-t border-cocoa/5 pt-5">
          {saved && (
            <button type="button" onClick={remove} className="btn-danger mr-auto">
              <Trash2 className="size-4" aria-hidden /> 移除
            </button>
          )}
          <button type="button" onClick={test} disabled={saving || testing} className="btn-ghost ml-auto">
            {testing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Zap className="size-4" aria-hidden />} 保存并测试
          </button>
          <button type="submit" disabled={saving || testing} className="btn-primary">
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />} 保存
          </button>
        </div>
      </form>
      <ImageSettings />
    </>
  );
}
