"use client";

import React, { useEffect, useState } from "react";
import { useDashboardData } from "../../contexts/DashboardDataContext";
import AnalyticsService, { type AnalyticsData } from "../../services/analyticsService";
import {
  TaskPieChart,
  PriorityBarChart,
  AreaPieChart,
  AreaCompletionChart,
  TimelineChart,
  ActiveTimeChart,
} from "./AnalyticsCharts";
import { Loader2, RefreshCw } from "lucide-react";

export default function AnalyticsDashboard() {
  const { data: snapshot } = useDashboardData();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [graphData, setGraphData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [snapshot]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch graph data
      const graphResponse = await fetch("/api/knowledge-graph/nodes");
      const graphDataResult = await graphResponse.json();
      setGraphData(graphDataResult);

      // Generate analytics
      if (snapshot) {
        const analyticsResult = AnalyticsService.aggregateAnalytics(
          snapshot,
          graphDataResult
        );
        setAnalytics(analyticsResult);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-slate-900 rounded-lg p-4 text-center">
        <p className="text-slate-400">Sem dados disponíveis</p>
      </div>
    );
  }

  const { taskMetrics, areaMetrics, knowledgeMetrics, timeline } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total de Tarefas"
          value={taskMetrics.total}
          unit=""
        />
        <MetricCard
          label="Taxa de Conclusão"
          value={Math.round(taskMetrics.completionRate * 100)}
          unit="%"
        />
        <MetricCard
          label="Notas no Vault"
          value={knowledgeMetrics.totalNotes}
          unit=""
        />
        <MetricCard
          label="Densidade do Grafo"
          value={Math.round(knowledgeMetrics.densityScore * 100)}
          unit="%"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskPieChart metrics={taskMetrics} />
        <PriorityBarChart metrics={taskMetrics} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AreaPieChart areas={areaMetrics} />
        <AreaCompletionChart areas={areaMetrics} />
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 gap-6">
        <TimelineChart timeline={timeline} />
      </div>

      {/* Charts Row 4 */}
      <div className="grid grid-cols-1 gap-6">
        <ActiveTimeChart timeline={timeline} />
      </div>

      {/* Area Metrics Table */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-4">Métricas por Área</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-2">Área</th>
                <th className="text-right p-2">Tarefas</th>
                <th className="text-right p-2">Concluídas</th>
                <th className="text-right p-2">Taxa (%)</th>
              </tr>
            </thead>
            <tbody>
              {areaMetrics.map((area) => (
                <tr key={area.name} className="border-b border-slate-700 hover:bg-slate-700">
                  <td className="p-2">{area.name}</td>
                  <td className="text-right p-2">{area.taskCount}</td>
                  <td className="text-right p-2">{area.completedCount}</td>
                  <td className="text-right p-2 text-green-400">
                    {Math.round(area.completionRate * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Metric Card Component
// ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
}

function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        <span className="text-sm ml-1">{unit}</span>
      </p>
    </div>
  );
}
