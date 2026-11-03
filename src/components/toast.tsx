"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; text: string };

const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Info;
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={clsx(
                "glass pointer-events-auto flex max-w-md animate-fade-up items-start gap-2.5 rounded-2xl px-4 py-3 text-sm",
                t.kind === "success" && "border-emerald-400/30",
                t.kind === "error" && "border-red-400/40",
              )}
            >
              <Icon className={clsx("mt-0.5 size-4 shrink-0", t.kind === "success" ? "text-emerald-700" : t.kind === "error" ? "text-red-700" : "text-neon-cyan")} aria-hidden />
              <span>{t.text}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
