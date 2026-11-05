"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shirt, Sparkles, ScanLine, Settings, LogOut } from "lucide-react";
import clsx from "clsx";
import { Logo } from "./logo";
import { api } from "@/lib/client";

const NAV = [
  { href: "/wardrobe", label: "衣柜", icon: Shirt },
  { href: "/outfits", label: "搭配", icon: Sparkles },
  { href: "/body", label: "身材", icon: ScanLine },
  { href: "/settings", label: "设置", icon: Settings },
] as const;

export function AppNav({ nickname }: { nickname: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-cocoa/5 bg-ink-950/60 p-5 backdrop-blur-xl lg:flex">
        <Logo />
        <nav className="mt-10 flex flex-col gap-1" aria-label="主导航">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                  active ? "bg-gradient-to-r from-neon-violet/25 to-transparent text-cocoa shadow-[inset_2px_0_0_var(--color-neon-violet)]" : "text-cocoa/75 hover:bg-cocoa/5 hover:text-cocoa",
                )}
              >
                <n.icon className="size-4.5" aria-hidden />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-cocoa/5 bg-cocoa/[0.03] p-3">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-neon-cyan/40 to-neon-violet/40 text-sm font-semibold">
            {nickname.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">{nickname}</span>
          <button onClick={logout} className="rounded-lg p-2 text-cocoa/75 hover:bg-cocoa/10 hover:text-cocoa" aria-label="退出登录" title="退出登录">
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="主导航"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-3xl border border-cocoa/10 bg-ink-900/80 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
      >
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={clsx("flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] transition", active ? "bg-cocoa/10 text-cocoa" : "text-cocoa/75")}
            >
              <n.icon className={clsx("size-5", active && "text-neon-cyan")} aria-hidden />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
