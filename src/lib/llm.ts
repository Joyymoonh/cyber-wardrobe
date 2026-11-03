import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { appDb as db } from "./database";
import { decrypt } from "./crypto";
import type { LlmProvider } from "./constants";
import { HttpError } from "./auth";

export type LlmConfig = {
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  visionModel?: string | null;
  apiKey?: string | null;
};

export type ImageInput = { mime: string; base64: string };

export async function loadLlmConfig(userId: string): Promise<LlmConfig | null> {
  const row = await db()
    .prepare("SELECT provider, base_url, model, vision_model, api_key_enc FROM llm_configs WHERE user_id = ?")
    .get(userId) as
    | { provider: LlmProvider; base_url: string | null; model: string; vision_model: string | null; api_key_enc: string | null }
    | undefined;
  if (!row) return null;
  let apiKey: string | null = null;
  try {
    apiKey = row.api_key_enc ? decrypt(row.api_key_enc) : null;
  } catch {
    apiKey = null; // APP_SECRET rotated; user must re-enter key
  }
  return {
    provider: row.provider,
    baseUrl: row.base_url || defaultBase(row.provider),
    model: row.model,
    visionModel: row.vision_model,
    apiKey,
  };
}

const defaultBase = (p: LlmProvider) =>
  p === "gemini" ? "https://generativelanguage.googleapis.com/v1beta" : "https://api.openai.com/v1";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/**
 * Guards server-side fetches to user-supplied URLs against SSRF into the host's private network.
 * Set ALLOW_PRIVATE_NETWORK=1 for self-hosted setups that need e.g. a local Ollama.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "URL 格式不正确");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new HttpError(400, "仅支持 http/https 地址");
  if (process.env.ALLOW_PRIVATE_NETWORK === "1") return url;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addrs.length === 0) throw new HttpError(400, "无法解析该域名");
  if (addrs.some(isPrivateIp)) throw new HttpError(400, "出于安全考虑，不允许访问内网地址");
  return url;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 90_000) {
  await assertPublicUrl(url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "error",
  }).catch((e: Error) => {
    throw new HttpError(502, `无法连接大模型服务：${e.name === "TimeoutError" ? "请求超时" : e.message}`);
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      msg = j.error?.message ?? j.message ?? msg;
    } catch {}
    throw new HttpError(502, `大模型返回错误 (${res.status})：${msg}`);
  }
  return JSON.parse(text);
}

/** Sends a single-turn prompt (optionally with images) and returns the model's raw text. */
export async function chat(
  cfg: LlmConfig,
  opts: { system: string; prompt: string; images?: ImageInput[]; json?: boolean },
): Promise<string> {
  const model = opts.images?.length ? cfg.visionModel || cfg.model : cfg.model;
  const base = cfg.baseUrl.replace(/\/+$/, "");

  if (cfg.provider === "gemini") {
    if (!cfg.apiKey) throw new HttpError(400, "请先在设置中填写 Gemini API Key");
    const parts: unknown[] = [{ text: opts.prompt }];
    for (const img of opts.images ?? []) parts.push({ inlineData: { mimeType: img.mime, data: img.base64 } });
    const data = await postJson(
      `${base}/models/${encodeURIComponent(model)}:generateContent`,
      { "x-goog-api-key": cfg.apiKey },
      {
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.8, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
      },
    );
    const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) throw new HttpError(502, "大模型没有返回内容（可能被安全策略拦截）");
    return text;
  }

  const content: unknown = opts.images?.length
    ? [
        { type: "text", text: opts.prompt },
        ...opts.images.map((img) => ({ type: "image_url", image_url: { url: `data:${img.mime};base64,${img.base64}` } })),
      ]
    : opts.prompt;
  const headers: Record<string, string> = cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {};
  const body = {
    model,
    temperature: 0.8,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content },
    ],
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
  };
  let data;
  try {
    data = await postJson(`${base}/chat/completions`, headers, body);
  } catch (e) {
    // Some compatible providers reject response_format; retry once without it.
    if (opts.json && e instanceof HttpError && e.status === 502 && /response_format|json/i.test(e.message)) {
      const { response_format: _drop, ...rest } = body;
      void _drop;
      data = await postJson(`${base}/chat/completions`, headers, rest);
    } else throw e;
  }
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new HttpError(502, "大模型没有返回内容");
  return typeof text === "string" ? text : JSON.stringify(text);
}

/** Extracts the first JSON object from model output (handles ```json fences and chatter). */
export function extractJson<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new HttpError(502, "大模型返回的内容无法解析");
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  const end = candidate.lastIndexOf(close);
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    throw new HttpError(502, "大模型返回的 JSON 格式不正确，请重试或换个模型");
  }
}
