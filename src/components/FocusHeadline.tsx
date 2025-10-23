import React from "react";

interface FocusHeadlineProps {
  text: string;
  excerpt?: string | null;
  source: "daily" | "weekly";
  isStale?: boolean;
  daysOld?: number | null;
}

const baseBadgeClass =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide";

const resolveSourceBadge = (source: "daily" | "weekly") => {
  if (source === "daily") {
    return `${baseBadgeClass} border-emerald-500/60 bg-emerald-500/10 text-emerald-300`;
  }
  return `${baseBadgeClass} border-sky-500/60 bg-sky-500/10 text-sky-300`;
};

const staleBadgeClass =
  "inline-flex items-center rounded-full border border-amber-500/60 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase text-amber-200";

const formatDaysOld = (daysOld?: number | null) => {
  if (typeof daysOld !== "number" || Number.isNaN(daysOld) || daysOld < 0) {
    return null;
  }
  if (daysOld === 0) {
    return "Atualizado hoje";
  }
  if (daysOld === 1) {
    return "Atualizado há 1 dia";
  }
  return `Atualizado há ${daysOld} dias`;
};

export function FocusHeadline({
  text,
  excerpt,
  source,
  isStale = false,
  daysOld,
}: FocusHeadlineProps) {
  const normalizedExcerpt =
    typeof excerpt === "string" && excerpt.trim().length > 0
      ? excerpt.trim()
      : null;
  const truncatedExcerpt =
    normalizedExcerpt && normalizedExcerpt.length > 200
      ? `${normalizedExcerpt.slice(0, 200)}…`
      : normalizedExcerpt;
  const daysLabel = formatDaysOld(daysOld);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={resolveSourceBadge(source)}>
          {source === "daily" ? "Foco Diário" : "Foco Semanal"}
        </span>
        {isStale && <span className={staleBadgeClass}>Desatualizado</span>}
        {daysLabel && (
          <span className="text-[11px] text-zinc-500">{daysLabel}</span>
        )}
      </div>
      <h2 className="text-2xl font-semibold text-white">{text}</h2>
      {truncatedExcerpt && (
        <p className="text-sm text-zinc-400 line-clamp-2">{truncatedExcerpt}</p>
      )}
    </div>
  );
}
