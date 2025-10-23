import { useMemo } from "react";
import type { DashboardCollection } from "../services/apiClient";

interface FocusItem {
  label: string;
  value: string | number;
}

interface DashboardHeaderProps {
  focusHeadline?: string;
  snapshot?: any;
  eventsConnected?: boolean;
  eventsError?: Error | null;
  refreshing?: boolean;
  activeProjectId?: string;
  collections?: DashboardCollection[];
}

interface DashboardHeaderReturn {
  focusHeadline: string;
  updatedLabel: string;
  error: string | null;
  activeCollection: DashboardCollection | null;
  focusSummary: FocusItem[];
  eventsConnected: boolean;
  eventsError: Error | null;
  refreshing: boolean;
}

export const useDashboardHeader = ({
  focusHeadline,
  snapshot,
  eventsConnected = false,
  eventsError = null,
  refreshing = false,
  activeProjectId,
  collections = [],
}: DashboardHeaderProps = {}): DashboardHeaderReturn => {
  const focusSummary = useMemo(() => {
    if (!snapshot) {
      return [
        { label: "Atrasadas", value: 0 },
        { label: "Hoje", value: 0 },
        { label: "Próximos dias", value: 0 },
      ];
    }

    const metrics = snapshot?.data?.tasks?.metrics;
    if (metrics) {
      return [
        { label: "Atrasadas", value: metrics.overdue ?? 0 },
        { label: "Hoje", value: metrics.dueToday ?? 0 },
        { label: "Próximos dias", value: metrics.upcoming ?? 0 },
      ];
    }
    
    return [];
  }, [snapshot]);

  const activeCollection = useMemo(() => {
    if (!activeProjectId) return null;
    return collections.find((item) => item.id === activeProjectId) || null;
  }, [activeProjectId, collections]);

  const updatedLabel = useMemo(() => {
    if (!snapshot?.generatedAt) {
      return "Atualizado às 07:01 pelo agente Daily Focus";
    }
    return `Atualizado às ${new Date(snapshot.generatedAt).toLocaleTimeString()}`;
  }, [snapshot]);

  const error = null; // TODO: Adicionar lógica de erro se necessário

  return {
    focusHeadline: focusHeadline || "Execução do piloto multi-tenant",
    updatedLabel,
    error,
    activeCollection,
    focusSummary,
    eventsConnected,
    eventsError,
    refreshing,
  };
};
