"use client";

import React from "react";
import ActiveProjectBanner from "./ActiveProjectBanner";
import FocusSummaryWidget from "./FocusSummaryWidget";

interface DashboardHeaderProps {
  focusHeadline: string;
  updatedLabel: string;
  error: string | null;
  activeCollection?: {
    id: string;
    label: string;
    description?: string;
  } | null;
  focusSummary: Array<{
    label: string;
    value: string | number;
  }>;
  eventsConnected: boolean;
  eventsError?: Error | null;
  refreshing: boolean;
  onRefresh?: () => void;
  eventsTooltipMessage?: string;

  // ActiveProjectBanner props
  onClearProjectFocus?: () => void;
  showProjectBanner?: boolean;

  // FocusSummaryWidget props
  showFocusSummary?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  focusHeadline,
  updatedLabel,
  error,
  activeCollection,
  focusSummary,
  eventsConnected,
  eventsError,
  refreshing,
  onRefresh,
  eventsTooltipMessage,
  onClearProjectFocus,
  showProjectBanner = true,
  showFocusSummary = true,
}) => {
  return (
    <div className="rounded-2xl border border-neutral-800/60 bg-neutral-950/80 px-6 py-4 shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Foco do dia
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            {focusHeadline}
          </h2>
          <p className="text-xs text-zinc-500">{updatedLabel}</p>
          {error && (
            <p className="mt-2 text-xs text-rose-400">{error}</p>
          )}
          {showProjectBanner && activeCollection && (
            <div className="mt-3">
              <ActiveProjectBanner
                activeCollection={activeCollection}
                onClearProjectFocus={onClearProjectFocus}
                showClearButton={!!onClearProjectFocus}
              />
            </div>
          )}
        </div>
        
        {showFocusSummary && (
          <div className="flex flex-wrap items-center gap-3">
            <FocusSummaryWidget
              focusSummary={focusSummary}
              eventsConnected={eventsConnected}
              eventsError={eventsError}
              refreshing={refreshing}
              onRefresh={onRefresh}
              eventsTooltipMessage={eventsTooltipMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
