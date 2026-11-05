"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, errMsg } from "@/lib/client";

export function AuthForm({ mode, inviteRequired = false }: { mode: "login" | "register"; inviteRequired?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/auth/${mode}`, { method: "POST", json: form });
      const next = params.get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : isRegister ? "/body" : "/wardrobe");
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass w-full max-w-sm animate-fade-up space-y-4 p-7" noValidate>
      <div>
        <h1 className="font-display text-2xl font-bold">{isRegister ? "创建账号" : "欢迎回来"}</h1>
        <p className="mt-1 text-sm text-cocoa/75">{isRegister ? "几秒钟，开启你的数字衣橱" : "登录继续管理你的衣柜"}</p>
      </div>
      <div>
        <label htmlFor="email" className="label">邮箱</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" />
      </div>
      {isRegister && (
        <div>
          <label htmlFor="nickname" className="label">昵称</label>
          <input id="nickname" name="nickname" required maxLength={20} className="input" placeholder="怎么称呼你" />
        </div>
      )}
      <div>
        <label htmlFor="password" className="label">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isRegister ? 8 : 1}
          autoComplete={isRegister ? "new-password" : "current-password"}
          className="input"
          placeholder={isRegister ? "至少 8 位" : "••••••••"}
        />
      </div>
      {isRegister && inviteRequired && <div><label htmlFor="invite" className="label">试用邀请码</label><input id="invite" name="invite" type="password" autoComplete="off" required className="input" placeholder="填写邀请人提供的邀请码"/></div>}
      {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full py-3">
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {isRegister ? "注册并开始" : "登录"}
      </button>
      <p className="text-center text-sm text-cocoa/75">
        {isRegister ? "已有账号？" : "还没有账号？"}
        <Link href={isRegister ? "/login" : "/register"} className="ml-1 text-neon-cyan hover:underline">
          {isRegister ? "去登录" : "免费注册"}
        </Link>
      </p>
    </form>
  );
}
