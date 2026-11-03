// Browser-side helpers.

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth")) {
    // Session expired mid-use; full reload clears client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data as T;
}

export async function uploadImage(file: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const { key } = await api<{ key: string }>("/api/upload", { method: "POST", body: fd });
  return key;
}

export const imageUrl = (key?: string | null) => (key ? `/api/images/${key}` : null);

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
