"use client";

import React from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import StatsWidget from "../StatsWidget";

interface FocusSummaryItem {
  label: string;
  value: string | number;
}

interface FocusSummaryWidgetProps {
  focusSummary: FocusSummaryItem[];
  eventsConnected: boolean;
  eventsError?: Error | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  eventsTooltipMessage?: string;
}

const FocusSummaryWidget: React.FC<FocusSummaryWidgetProps> = ({
  focusSummary,
  eventsConnected,
  eventsError,
  refreshing = false,
  onRefresh,
  eventsTooltipMessage
}) => {
  const getConnectionStatus = () => {
    if (eventsError) {
      return {
        text: "Offline",
        color: "bg-rose-500",
        tooltip: eventsError.message || "Tentando reconectar aos eventos"
      };
    }
    if (eventsConnected) {
      return {
        text: "Live", 
        color: "bg-emerald-500 animate-pulse",
        tooltip: "Conectado ao Brain Cloud"
      };
    }
    return {
      text: "Reconectando",
      color: "bg-amber-400 animate-pulse", 
      tooltip: "Tentando reconectar aos eventos"
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {focusSummary.map((item) => (
        <StatsWidget
          key={item.label}
          title={item.label}
          value={item.value}
          trend={item.label.toLowerCase().includes('atrasada') ? 'down' : 'neutral'}
        />
      ))}
      
      <div
        className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-xs uppercase tracking-wide text-zinc-400"
        title={eventsTooltipMessage || connectionStatus.tooltip}
      >
        <span
          className={`h-2 w-2 rounded-full ${connectionStatus.color}`}
        />
        <span>{connectionStatus.text}</span>
      </div>
      
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
          title="Recarregar dados"
        >
          <RefreshCw
            className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
          />
          Recarregar
        </button>
      )}
    </div>
  );
};

export default FocusSummaryWidget;
