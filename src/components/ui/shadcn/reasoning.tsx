"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronsUpDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

type ReasoningProps = {
  isStreaming?: boolean;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Reasoning({
  isStreaming = false,
  defaultOpen = false,
  className,
  children,
}: ReasoningProps) {
  const [open, setOpen] = React.useState(defaultOpen || isStreaming);
  const wasStreamingRef = React.useRef(isStreaming);

  React.useEffect(() => {
    // Autoabre quando começa a streamar; não fecha automaticamente quando parar
    if (isStreaming && !wasStreamingRef.current) {
      setOpen(true);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  React.useEffect(() => {
    setOpen((prev) => prev || defaultOpen);
  }, [defaultOpen]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("w-full", className)}>
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          Raciocínio
          {isStreaming && (
            <span className="text-[10px] font-medium text-amber-300 animate-pulse">
              pensando...
            </span>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
            aria-label="Alternar raciocínio"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="border-l-2 border-amber-300/70 pl-3 text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ReasoningContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("whitespace-pre-wrap", className)}>{children}</div>;
}

export function ReasoningTrigger({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] uppercase tracking-wide text-amber-100 hover:border-amber-400/40",
        className
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {children || "Raciocínio"}
    </button>
  );
}
