'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  BarChart3,
  Brain,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import EnhancedAIInsightCard from './EnhancedAIInsightCard';
import apiClient, {
  SynergyInsight,
} from '../services/apiClient';

type InsightPriority = 'high' | 'medium' | 'low';

type BoardInsight = {
  id: string;
  title: string;
  description: string;
  confidence: number;
  priority: InsightPriority;
  actionable: boolean;
  timestamp: string;
  connectedNotes: string[];
  suggestedActions: string[];
  relatedProjects: string[];
};

const filterButtonClass =
  'inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/50 hover:text-emerald-300';

const StrategicInsights: React.FC = () => {
  const [insights, setInsights] = useState<SynergyInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | InsightPriority>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [minConfidence, setMinConfidence] = useState(60);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getInsights();
      setInsights(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load insights:', error);
      toast.error('Não foi possível carregar os insights estratégicos.');
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    setLoading(true);
    try {
      const response = await apiClient.refreshInsights();
      setInsights(Array.isArray(response) ? response : []);
      toast.success('Insights atualizados com sucesso.');
    } catch (error) {
      console.error('Failed to refresh insights:', error);
      toast.error('Não foi possível atualizar os insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const boardInsights: BoardInsight[] = useMemo(() => {
    return insights.map((insight) => {
      const confidenceValue = Math.round((insight.confidence ?? 0) * 100);
      const urgency = String(insight.urgency ?? '').toLowerCase();
      let priority: InsightPriority;
      if (urgency === 'high') priority = 'high';
      else if (urgency === 'medium') priority = 'medium';
      else if (urgency === 'low') priority = 'low';
      else if (confidenceValue >= 75) priority = 'high';
      else if (confidenceValue >= 50) priority = 'medium';
      else priority = 'low';

      const normalizedSuggestedActions =
        Array.isArray((insight as any).suggestedActions)
          ? (insight as any).suggestedActions.map(String)
          : Array.isArray((insight as any).suggested_actions)
          ? (insight as any).suggested_actions.map(String)
          : typeof (insight as any).suggestedAction === 'string'
          ? [(insight as any).suggestedAction]
          : typeof (insight as any).suggested_action === 'string'
          ? [(insight as any).suggested_action]
          : [];

      const normalizedRelatedProjects =
        Array.isArray((insight as any).relatedProjects)
          ? (insight as any).relatedProjects.map(String)
          : [];

      const normalizedNotes = Array.isArray(insight.relatedNotes)
        ? insight.relatedNotes.map(String)
        : [];

      const actionable =
        normalizedSuggestedActions.length > 0 ||
        String(insight.suggestedAction ?? '').trim().length > 0;

      return {
        id: insight.id ?? insight.title ?? Math.random().toString(36),
        title: insight.title ?? 'Insight sem título',
        description: insight.description ?? insight.content ?? '',
        confidence: confidenceValue,
        priority,
        actionable,
        timestamp:
          insight.createdAt ??
          new Date().toISOString(),
        connectedNotes: normalizedNotes,
        suggestedActions:
          normalizedSuggestedActions.length > 0
            ? normalizedSuggestedActions
            : insight.suggestedAction
            ? [insight.suggestedAction]
            : [],
        relatedProjects: normalizedRelatedProjects,
      };
    });
  }, [insights]);

  const filteredInsights = useMemo(() => {
    return boardInsights.filter((insight) => {
      const matchesPriority =
        priorityFilter === 'all' || insight.priority === priorityFilter;
      const matchesConfidence = insight.confidence >= minConfidence;
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPriority && matchesConfidence && matchesSearch;
    });
  }, [boardInsights, priorityFilter, minConfidence, searchTerm]);

  const summary = useMemo(() => {
    if (boardInsights.length === 0) {
      return {
        total: 0,
        actionable: 0,
        avgConfidence: 0,
        highImpact: 0,
      };
    }
    const total = boardInsights.length;
    const actionable = boardInsights.filter((item) => item.actionable).length;
    const avgConfidence = Math.round(
      boardInsights.reduce((sum, item) => sum + item.confidence, 0) / total
    );
    const highImpact = boardInsights.filter(
      (item) => item.priority === 'high'
    ).length;
    return {
      total,
      actionable,
      avgConfidence,
      highImpact,
    };
  }, [boardInsights]);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-6 shadow-inner shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-zinc-100">
              <Brain className="h-6 w-6 text-emerald-400" />
              Strategic Insights Board
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Intelligence hub com insights priorizados, confiança e ações
              recomendadas para o board executivo.
            </p>
          </div>
          <div className="grid w-full gap-3 text-sm text-zinc-300 sm:grid-cols-2 lg:w-auto">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Insights ativos
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {summary.total}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Confiança média
              </p>
              <p className="mt-1 text-2xl font-bold text-sky-300">
                {summary.avgConfidence}%
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-inner shadow-black/20 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-zinc-400">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por título ou descrição..."
              className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-zinc-400">
            <Filter className="h-4 w-4 text-zinc-500" />
            <select
              className="w-full bg-transparent text-sm text-zinc-100 focus:outline-none"
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value as 'all' | InsightPriority
                )
              }
            >
              <option value="all">Todas as prioridades</option>
              <option value="high">Alta prioridade</option>
              <option value="medium">Média prioridade</option>
              <option value="low">Baixa prioridade</option>
            </select>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-zinc-400">
            <BarChart3 className="h-4 w-4 text-zinc-500" />
            <span className="flex-1 text-xs uppercase tracking-wide text-zinc-500">
              Confiança mínima: {minConfidence}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minConfidence}
              onChange={(event) =>
                setMinConfidence(Number(event.target.value))
              }
              className="flex-1 accent-emerald-500"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchInsights}
            className={filterButtonClass}
          >
            <Filter className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={refreshInsights}
            className={filterButtonClass}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Atualizar insights
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          <p className="text-sm text-zinc-500">
            Consolidando inteligência estratégica...
          </p>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center">
          <Sparkles className="h-8 w-8 text-zinc-600" />
          <p className="font-medium text-zinc-300">
            Nenhum insight corresponde aos filtros atuais
          </p>
          <p className="text-sm text-zinc-500">
            Ajuste os filtros ou gere novos insights para alimentar decisões e
            sessões estratégicas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredInsights.map((insight) => (
            <EnhancedAIInsightCard
              key={insight.id}
              id={insight.id}
              title={insight.title}
              insight={insight.description}
              confidence={insight.confidence}
              priority={insight.priority}
              actionable={insight.actionable}
              timestamp={insight.timestamp}
              connectedNotes={insight.connectedNotes}
              suggestedActions={insight.suggestedActions}
              relatedProjects={insight.relatedProjects}
            />
          ))}
        </div>
      )}

      <footer className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 text-sm text-zinc-400">
        <p className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 text-amber-400" />
          <span>
            Este painel consome dados em tempo real de <code>/api/insights</code>{' '}
            e potencializa o planejamento do sprint estratégico. Conecte os
            insights às sessões planejadas para manter o alinhamento entre
            descobertas e execução.
          </span>
        </p>
      </footer>
    </section>
  );
};

export default StrategicInsights;
