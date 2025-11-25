"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function PromptInput({
  onSubmit,
  children,
  className,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "w-full rounded-xl border border-neutral-800 bg-neutral-950/90 shadow-lg shadow-black/30",
        className
      )}
    >
      {children}
    </form>
  );
}

export function PromptInputTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-none border-0 bg-transparent px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none",
        "min-h-[60px] max-h-[200px]",
        props.className
      )}
      rows={props.rows ?? 1}
    />
  );
}

export function PromptInputToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-neutral-800 bg-neutral-950/80 px-3 py-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PromptInputSubmit({
  disabled,
  className,
}: {
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition",
        "hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      Enviar
    </button>
  );
}
