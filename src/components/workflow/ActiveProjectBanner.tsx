"use client";

import React from "react";
import { Sparkles, X } from "lucide-react";
import { DashboardCollection } from "../../services/apiClient";

interface ActiveProjectBannerProps {
  activeCollection: DashboardCollection | null;
  onClearProject?: () => void;
  showClearButton?: boolean;
}

const ActiveProjectBanner: React.FC<ActiveProjectBannerProps> = ({ 
  activeCollection, 
  onClearProject,
  showClearButton = true 
}) => {
  if (!activeCollection) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
      <Sparkles className="h-3 w-3" />
      <span>
        Projeto ativo:&nbsp;
        <strong className="text-emerald-100">
          {activeCollection.label}
        </strong>
      </span>
      {showClearButton && onClearProject && (
        <button
          onClick={onClearProject}
          className="ml-1 rounded-full p-0.5 hover:bg-emerald-500/20 transition-colors"
          title="Limpar projeto ativo"
        >
          <X className="h-3 w-3 text-emerald-300" />
        </button>
      )}
    </div>
  );
};

export default ActiveProjectBanner;
