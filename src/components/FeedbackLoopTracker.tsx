'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Filter,
  Loader2,
  LucideIcon,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import apiClient, { FeedbackAction } from '@/services/apiClient';

type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed';
type TypeFilter =
  | 'all'
  | 'decision'
  | 'insight_validation'
  | 'action_taken'
  | 'learning_captured';
type PeriodFilter = '7d' | '30d' | '90d' | 'all';

type TimelineAction = FeedbackAction & {
  formattedDate: string;
  relativeTime: string;
};

const periodWindows: Record<Exclude<PeriodFilter, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const statusBadges: Record<
  Exclude<StatusFilter, 'all'>,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pendente',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  },
  processing: {
    label: 'Em progresso',
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  },
  completed: {
    label: 'Concluído',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  },
  failed: {
    label: 'Falhou',
    className: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  },
};

const typeLabels: Record<Exclude<TypeFilter, 'all'>, string> = {
  decision: 'Decisão',
  insight_validation: 'Validação de insight',
  action_taken: 'Ação executada',
  learning_captured: 'Lição registrada',
};

const feedbackTypeIcons: Record<Exclude<TypeFilter, 'all'>, LucideIcon> = {
  decision: CheckCircle2,
  insight_validation: TrendingUp,
  action_taken: ArrowUpRight,
  learning_captured: BarChart2,
};

const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d atrás`;
  return date.toLocaleDateString();
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data inválida';
  }
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const FeedbackLoopTracker: React.FC = () => {
  const [actions, setActions] = useState<FeedbackAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getFeedbackActions();
      setActions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load feedback loop tracker data', error);
      toast.error('Não foi possível carregar os loops de feedback.');
    } finally {
      setLoading(false);
    }
  };

  const refreshActions = async () => {
    setRefreshing(true);
    try {
      const data = await apiClient.getFeedbackActions();
      setActions(Array.isArray(data) ? data : []);
      toast.success('Feedback loops atualizados.');
    } catch (error) {
      console.error('Failed to refresh feedback loop tracker data', error);
      toast.error('Falha ao atualizar loops de feedback.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const filteredActions = useMemo(() => {
    const windowDays =
      periodFilter === 'all' ? null : periodWindows[periodFilter];
    const now = Date.now();

    return actions.filter((action) => {
      if (
        statusFilter !== 'all' &&
        action.status?.toLowerCase() !== statusFilter
      ) {
        return false;
      }
      if (
        typeFilter !== 'all' &&
        action.type?.toLowerCase() !== typeFilter
      ) {
        return false;
      }
      if (windowDays !== null && action.timestamp) {
        const actionDate = new Date(action.timestamp).getTime();
        if (Number.isNaN(actionDate)) return false;
        const diffInDays = (now - actionDate) / (1000 * 60 * 60 * 24);
        if (diffInDays > windowDays) return false;
      }
      return true;
    });
  }, [actions, statusFilter, typeFilter, periodFilter]);

  const timelineEntries: TimelineAction[] = useMemo(() => {
    return filteredActions
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.timestamp || '').getTime();
        const bTime = new Date(b.timestamp || '').getTime();
        return Number.isNaN(bTime) ? -1 : bTime - aTime;
      })
      .map((action) => ({
        ...action,
        formattedDate: action.timestamp
          ? formatDateTime(action.timestamp)
          : 'Data indisponível',
        relativeTime: action.timestamp
          ? formatRelativeTime(action.timestamp)
          : '',
      }));
  }, [filteredActions]);

  const metrics = useMemo(() => {
    const total = filteredActions.length;
    const completed = filteredActions.filter(
      (item) => item.status === 'completed'
    ).length;
    const implementationRate = total
      ? Math.round((completed / total) * 100)
      : 0;

    const completedItems = filteredActions.filter(
      (item) => item.status === 'completed' && item.timestamp
    );
    const avgCycleTime =
      completedItems.length > 0
        ? Math.round(
            completedItems.reduce((acc, item) => {
              const created = new Date(item.timestamp as string).getTime();
              const diff =
                Date.now() - (Number.isNaN(created) ? Date.now() : created);
              return acc + diff;
            }, 0) /
              completedItems.length /
              (1000 * 60 * 60 * 24)
          )
        : null;

    const categories = filteredActions.reduce<Record<string, number>>(
      (acc, item) => {
        const key = item.type || 'desconhecido';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      total,
      completed,
      implementationRate,
      avgCycleTimeDays: avgCycleTime,
      categories,
    };
  }, [filteredActions]);

  const trendData = useMemo(() => {
    if (actions.length === 0) return [];
    const days =
      periodFilter === 'all' ? 14 : Math.min(periodWindows[periodFilter], 14);
    const now = new Date();
    const buckets: { label: string; value: number }[] = [];

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const value = filteredActions.filter((action) => {
        if (!action.timestamp) return false;
        return action.timestamp.startsWith(key);
      }).length;
      buckets.push({
        label: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        value,
      });
    }
    return buckets;
  }, [filteredActions, actions.length, periodFilter]);

  const maxTrendValue =
    trendData.length > 0
      ? Math.max(...trendData.map((point) => point.value))
      : 0;

  const chartPoints =
    trendData.length > 0
      ? trendData.map((point, index) => {
          const x =
            trendData.length === 1
              ? 0
              : (index / (trendData.length - 1)) * 100;
          const y =
            maxTrendValue === 0
              ? 100
              : 100 - (point.value / maxTrendValue) * 100;
          return `${x},${y}`;
        })
      : [];

  const handleCopyNote = async (notePath?: string | null) => {
    if (!notePath) return;
    try {
      await navigator.clipboard?.writeText(notePath);
      toast.success('Link da nota copiado para a área de transferência.');
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Não foi possível copiar o link da nota.');
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-5 shadow-inner shadow-black/30 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Feedback Loop Tracker
          </h2>
          <p className="text-sm text-zinc-400">
            Acompanhe o ciclo completo de feedback → ação → resultado e a
            evolução das melhorias implementadas.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshActions}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Atualizar
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Taxa de implementação"
          value={`${metrics.implementationRate}%`}
          description={`${metrics.completed} de ${metrics.total} loops concluídos`}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Tempo médio de ciclo"
          value={
            metrics.avgCycleTimeDays !== null
              ? `${metrics.avgCycleTimeDays} dias`
              : 'N/D'
          }
          description="Média entre captura e conclusão"
          icon={Clock}
        />
        <MetricCard
          title="Categorias monitoradas"
          value={Object.keys(metrics.categories).length.toString()}
          description="Distribuição por tipo de feedback"
          icon={Filter}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <span className="uppercase tracking-wide text-zinc-500">
            Filtros:
          </span>
        </div>
        <select
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="processing">Em progresso</option>
          <option value="completed">Concluído</option>
          <option value="failed">Falhou</option>
        </select>
        <select
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
        >
          <option value="all">Todos os tipos</option>
          <option value="decision">Decisão</option>
          <option value="insight_validation">Validação de insight</option>
          <option value="action_taken">Ação executada</option>
          <option value="learning_captured">Lição capturada</option>
        </select>
        <select
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          value={periodFilter}
          onChange={(event) =>
            setPeriodFilter(event.target.value as PeriodFilter)
          }
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="all">Todo o histórico</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 shadow-inner shadow-black/20">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Evolução do pipeline
          </h3>
          <div className="h-36">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-400" />
                Carregando gráfico...
              </div>
            ) : trendData.length > 0 ? (
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <defs>
                  <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,100 ${chartPoints.join(' ')} 100,100`}
                  fill="url(#trendFill)"
                  stroke="none"
                />
                <polyline
                  points={chartPoints.join(' ')}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {trendData.map((point, index) => {
                  const x =
                    trendData.length === 1
                      ? 0
                      : (index / (trendData.length - 1)) * 100;
                  const y =
                    maxTrendValue === 0
                      ? 100
                      : 100 - (point.value / maxTrendValue) * 100;
                  return (
                    <g key={`${point.label}-${index}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r={1.4}
                        fill="#34d399"
                        stroke="#0f172a"
                        strokeWidth={0.4}
                      />
                    </g>
                  );
                })}
              </svg>
            ) : (
              <p className="text-sm text-zinc-500">
                Sem dados no período selecionado.
              </p>
            )}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(metrics.categories).map(([category, count]) => {
              const icon =
                feedbackTypeIcons[
                  (category as Exclude<TypeFilter, 'all'>) || 'decision'
                ] || Filter;
              return (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-xs text-zinc-300"
                >
                  <div className="flex items-center gap-2">
                    {React.createElement(icon, {
                      className: 'h-4 w-4 text-emerald-300',
                    })}
                    <span>{typeLabels[category as keyof typeof typeLabels] ?? category}</span>
                  </div>
                  <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] text-zinc-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 shadow-inner shadow-black/20">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            <AlertCircle className="h-4 w-4 text-emerald-400" />
            Destaques rápidos
          </h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
              <div>
                <p className="font-medium">
                  {metrics.completed} loops concluídos no período
                </p>
                <p className="text-xs text-zinc-500">
                  Foque nas categorias com impacto direto em receita.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2">
              <Clock className="mt-0.5 h-4 w-4 text-sky-400" />
              <div>
                <p className="font-medium">
                  Tempo médio{' '}
                  {metrics.avgCycleTimeDays !== null
                    ? `${metrics.avgCycleTimeDays} dias`
                    : 'indefinido'}
                </p>
                <p className="text-xs text-zinc-500">
                  Utilize automation/agents para reduzir ciclos mais longos.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2">
              <BarChart2 className="mt-0.5 h-4 w-4 text-amber-400" />
              <div>
                <p className="font-medium">
                  {Object.keys(metrics.categories).length} categorias ativas
                </p>
                <p className="text-xs text-zinc-500">
                  Verifique se há equilíbrio entre decisões estratégicas e
                  execuções táticas.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/95 p-5 shadow-inner shadow-black/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Timeline de loops ({timelineEntries.length})
          </h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
        </div>
        {timelineEntries.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 p-6 text-center text-sm text-zinc-500">
            Nenhum loop encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {timelineEntries.map((action) => {
              const statusStyle =
                statusFilter !== 'all' && statusBadges[statusFilter]
                  ? statusBadges[statusFilter]
                  : statusBadges[
                      (action.status as Exclude<StatusFilter, 'all'>) ||
                        'pending'
                    ] || statusBadges.pending;

              const Icon =
                feedbackTypeIcons[
                  (action.type as Exclude<TypeFilter, 'all'>) || 'decision'
                ] || TrendingUp;

              return (
                <article
                  key={action.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 transition hover:border-emerald-500/40 hover:bg-neutral-900"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-2">
                        <Icon className="h-4 w-4 text-emerald-300" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-100">
                            {typeLabels[
                              (action.type as keyof typeof typeLabels) ??
                                'decision'
                            ] ?? action.type}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${statusStyle.className}`}
                          >
                            {statusStyle.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-300">
                          {action.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide text-zinc-500">
                          <span>{action.formattedDate}</span>
                          {action.relativeTime && (
                            <span>{action.relativeTime}</span>
                          )}
                          {action.relatedProject && (
                            <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-zinc-400">
                              Projeto: {action.relatedProject}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {action.obsidianNote && (
                        <button
                          type="button"
                          onClick={() => handleCopyNote(action.obsidianNote)}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
                        >
                          <ClipboardCopy className="h-3.5 w-3.5" />
                          Copiar nota
                        </button>
                      )}
                      {action.impact && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                          {action.impact}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
}) => (
  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 shadow-inner shadow-black/30">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <Icon className="h-4 w-4 text-emerald-400" />
    </div>
    <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    <p className="mt-2 text-xs text-zinc-500">{description}</p>
  </div>
);

export default FeedbackLoopTracker;

