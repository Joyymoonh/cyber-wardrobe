"use client";

import { useEffect, useRef, useId } from "react";

import { X } from "lucide-react";
import clsx from "clsx";
import { colorHex } from "@/lib/constants";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="studio-title text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-cocoa/55">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Accessible modal built on <dialog>; slides up as a sheet on mobile. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId=useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClose={() => {}}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
      className={clsx(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-cocoa/10 bg-ink-900 p-0 text-cocoa backdrop:bg-[#242b24]/35 backdrop:backdrop-blur-sm",
        "sm:m-auto sm:rounded-3xl",
        wide ? "sm:max-w-3xl" : "sm:max-w-lg",
      )}
    >
      {open && (
        <div className="animate-fade-up p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 id={titleId} className="font-display text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="rounded-xl p-2 text-cocoa/75 hover:bg-cocoa/10 hover:text-cocoa" aria-label="关闭">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ChipGroup<T extends string>({
  options, value, onChange, multiple = true, label,
}: {
  options: readonly { id: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  multiple?: boolean;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            className={clsx("chip", on && "chip-on")}
            onClick={() => onChange(multiple ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : on ? [] : [o.id])}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Swatch({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      title={name}
      className={clsx("inline-block shrink-0 rounded-full ring-1 ring-cocoa/25", size === "sm" ? "size-3" : "size-5")}
      style={{ background: colorHex(name) }}
    />
  );
}

export function EmptyState({ icon: _Icon, title, desc, action }: { icon: React.ElementType; title: string; desc: string; action?: React.ReactNode }) {
  void _Icon;
  return (
    <div className="glass flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-full bg-[#e9ede5] font-serif text-3xl text-[#40594b]">＋</div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-cocoa/75">{desc}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
