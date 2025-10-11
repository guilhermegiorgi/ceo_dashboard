import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Anchor,
  AlertTriangle,
  BellRing,
  Brain,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Command,
  FilePlus2,
  Flame,
  Headphones,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  LogOut,
  Mic,
  Play,
  RefreshCw,
  Settings,
  Sparkles,
  User,
  Tag,
  Timer,
} from 'lucide-react';
import type { DashboardSnapshot } from '../services/apiClient';
import type { AgentRun } from '../services/apiClient';
import { useAPI } from '../hooks/useAPI';
import { useSettingsModal } from '../contexts/SettingsModalContext';

type TimelineCard =
  | {
      id: string;
      type: 'message';
      author: 'user' | 'assistant';
      title: string;
      body: string;
      timestamp: string;
      actions?: Array<{ label: string; icon: React.ReactNode }>;
    }
  | {
      id: string;
      type: 'insight';
      title: string;
      body: string;
      tags: string[];
      impact: string;
      timestamp: string;
      confidence: number;
    }
  | {
      id: string;
      type: 'note';
      title: string;
      snippet: string;
      related: string[];
      timestamp: string;
    }
  | {
      id: string;
      type: 'agent';
      title: string;
      status: 'running' | 'completed' | 'scheduled';
      description: string;
      nextRun?: string;
      timestamp: string;
    };

type Task = {
  id: string;
  title: string;
  status: 'overdue' | 'today' | 'upcoming';
  dueDate?: string;
  dueTime?: string;
  project?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  filePath?: string;
  sourceType?: string;
};

const navItems = [
  { label: 'Today', icon: <Flame className="h-4 w-4 text-zinc-200" />, active: true },
  { label: 'Stats', icon: <Activity className="h-4 w-4 text-zinc-300" />, badge: 4 },
  { label: 'Projects', icon: <Layers className="h-4 w-4 text-zinc-300" />, badge: 6 },
  { label: 'Library', icon: <Anchor className="h-4 w-4 text-zinc-300" /> },
  { label: 'Chats', icon: <Command className="h-4 w-4 text-zinc-300" />, badge: '+' },
  { label: 'Agents', icon: <Sparkles className="h-4 w-4 text-zinc-300" />, badge: 3 },
];

const navCollections = [
  { label: 'C-Level Weekly', icon: <Calendar className="h-4 w-4 text-zinc-200" /> },
  { label: 'NK Insights', icon: <Brain className="h-4 w-4 text-zinc-200" /> },
  { label: 'Fusão Agro', icon: <Tag className="h-4 w-4 text-zinc-200" /> },
  { label: 'Pessoal', icon: <BellRing className="h-4 w-4 text-zinc-200" /> },
];

const FALLBACK_TIMELINE: TimelineCard[] = [
  {
    id: 'card-1',
    type: 'message',
    author: 'assistant',
    title: 'Bom dia! Aqui está o foco do dia:',
    body: '• Validar proposta de automação IA com a Cooperativa Verde.\n• Finalizar roteiro do piloto multi-tenant.\n• Revisar 4 notas marcadas como “pending review”.',
    timestamp: '08:00',
    actions: [
      { label: 'Avaliar notas', icon: <Link2 className="h-4 w-4" /> },
      { label: 'Gerar resumo diário', icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    id: 'card-2',
    type: 'insight',
    title: 'Insight IA: onboarding Agro SaaS',
    body: 'Padrões de reuniões + notas indicam oportunidade de oferecer onboarding express para cooperativas (ticket médio R$ 18k).',
    impact: 'Potencial +R$ 90k / trimestre',
    confidence: 0.82,
    tags: ['#estratégia', '#agronegócio', '#produto'],
    timestamp: 'Ontem • 19:42',
  },
  {
    id: 'card-3',
    type: 'note',
    title: 'Transcrição – Reunião NK Insights',
    snippet:
      'Squads escolhidos para agentes autônomos: suporte, BI e agricultura digital. Integração inicial com dashboards existentes...',
    related: ['Roadmap IA NK', 'Hypersprint #03'],
    timestamp: 'Ontem • 17:22',
  },
  {
    id: 'card-4',
    type: 'agent',
    title: 'Agente Daily Focus concluído',
    status: 'completed',
    description: 'Resumo diário gerado das notas 09/10 + tarefas atrasadas. 4 insights sugeridos.',
    nextRun: 'Próxima execução às 07:00',
    timestamp: 'Hoje • 07:01',
  },
  {
    id: 'card-5',
    type: 'message',
    author: 'user',
    title: 'Pergunta',
    body: 'Quais riscos estratégicos preciso revisar esta semana?',
    timestamp: 'Ontem • 21:13',
    actions: [{ label: 'Ver resposta', icon: <ChevronRight className="h-4 w-4" /> }],
  },
];

const FALLBACK_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Validar proposta IA com Cooperativa Verde',
    status: 'overdue',
    dueDate: '08/10',
    project: 'GG.AI Labs',
    priority: 'high',
  },
  {
    id: 'task-2',
    title: 'Fechar agenda com executivos NK (piloto multi-tenant)',
    status: 'today',
    dueTime: '10:30',
    project: 'NK Insights',
    priority: 'medium',
  },
  {
    id: 'task-3',
    title: 'Revisar notas pendentes de validação',
    status: 'today',
    project: 'Segundo Cérebro',
    priority: 'medium',
  },
  {
    id: 'task-4',
    title: 'Preparar briefing IA para webinar C-Level Agro',
    status: 'upcoming',
    dueDate: '11/10',
    project: 'Conteúdo',
    priority: 'low',
  },
];

const FALLBACK_PINNED_INSIGHTS = [
  {
    id: 'pin-1',
    title: 'Playbook onboarding IA em 7 dias',
    description: 'Sequência de passos para onboarding express em cooperativas. Atualizado ontem.',
    source: 'Insight IA • Alta prioridade',
  },
  {
    id: 'pin-2',
    title: 'Mapa de decisões críticas NK Insights',
    description: 'Top 5 decisões que dependem de dados atualizados nas próximas duas semanas.',
    source: 'Decision Journal',
  },
];

const FALLBACK_FOCUS_SUMMARY = [
  { label: 'Projetos ativos', value: 5 },
  { label: 'Insights novos', value: 8 },
  { label: 'Tarefas críticas', value: 3 },
];

const FALLBACK_AGENT_CARDS = [
  { id: 'agent-1', name: 'Daily Focus', status: 'Executado', time: '07:01', icon: <Sparkles className="h-4 w-4 text-emerald-300" /> },
  { id: 'agent-2', name: 'Linker Insights', status: 'Rodando', time: 'agora', icon: <Loader2 className="h-4 w-4 text-sky-300 animate-spin" /> },
  { id: 'agent-3', name: 'Weekly Digest', status: 'Agendado', time: 'Sáb • 08:00', icon: <Timer className="h-4 w-4 text-zinc-300" /> },
];

type AgentCardData = {
  id: string;
  name: string;
  status: string;
  time: string;
  icon: React.ReactNode;
};

const formatDateShort = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
};

const formatTimeShort = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const formatTimestampLabel = (value?: string) => {
  if (!value) return 'agora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const formatDateTimeRange = (start?: string, end?: string) => {
  if (end) {
    return `Finalizado às ${formatTimestampLabel(end)}`;
  }
  if (start) {
    return `Iniciado às ${formatTimestampLabel(start)}`;
  }
  return 'Execução sem horário registrado';
};

const normalizeAgentStatus = (status?: string) => {
  const value = (status || '').toLowerCase();
  if (value.includes('running')) return 'Rodando';
  if (value.includes('success') || value.includes('completed')) return 'Executado';
  if (value.includes('fail') || value.includes('error')) return 'Falha';
  return 'Agendado';
};

const buildAgentCard = (run: AgentRun): AgentCardData => {
  const statusLabel = normalizeAgentStatus(run.status);
  let icon: React.ReactNode = <Timer className="h-4 w-4 text-zinc-300" />;
  if (statusLabel === 'Executado') {
    icon = <Sparkles className="h-4 w-4 text-emerald-300" />;
  } else if (statusLabel === 'Rodando') {
    icon = <Loader2 className="h-4 w-4 text-sky-300 animate-spin" />;
  } else if (statusLabel === 'Falha') {
    icon = <AlertTriangle className="h-4 w-4 text-rose-300" />;
  }

  const timeLabel = formatDateTimeRange(run.start_time, run.end_time);

  return {
    id: run.id,
    name: run.agent_name || 'Agente',
    status: statusLabel,
    time: timeLabel,
    icon,
  };
};

const BusinessIntelligenceHub: React.FC = () => {
  const api = useAPI();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'agenda' | 'insights' | 'agents'>('tasks');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSnapshot = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const data = await api.getDashboardSnapshot();
        setSnapshot(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard snapshot', err);
        const message =
          err instanceof Error ? err.message : 'Falha ao carregar dados do dashboard.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api]
  );

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const focusSummary = useMemo(() => {
    const metrics = snapshot?.data?.tasks?.metrics;
    if (metrics) {
      return [
        { label: 'Atrasadas', value: metrics.overdue ?? 0 },
        { label: 'Hoje', value: metrics.dueToday ?? 0 },
        { label: 'Próximos dias', value: metrics.upcoming ?? 0 },
      ];
    }
    return FALLBACK_FOCUS_SUMMARY;
  }, [snapshot]);

  const tasksList = useMemo<Task[]>(() => {
    const simplified = snapshot?.data?.tasks?.simplified;
    if (simplified && simplified.length > 0) {
      return simplified.map((item) => ({
        id: item.id,
        title: item.title,
        status: (item.status as Task['status']) || 'upcoming',
        dueDate: item.dueDate,
        dueTime: item.dueTime,
        project: item.project,
        priority: item.priority as Task['priority'],
        tags: item.tags,
        filePath: item.filePath,
        sourceType: item.sourceType,
      }));
    }
    return FALLBACK_TASKS;
  }, [snapshot]);

  const now = useMemo(() => new Date(), [snapshot]);
  const agendaBuckets = useMemo(() => {
    const result = { today: [] as Array<{ title: string; time?: string }>, upcoming: [] as Array<{ title: string; label: string }> };
    const deadlines = snapshot?.data?.timeContext?.upcoming_deadlines || [];

    const isSameDay = (dateA: Date, dateB: Date) =>
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate();

    deadlines.forEach((deadline) => {
      const due = deadline.due_date ? new Date(deadline.due_date) : null;
      if (due && isSameDay(due, now)) {
        const timeLabel = deadline.due_time ? formatTimeShort(deadline.due_time) : undefined;
        result.today.push({
          title: deadline.title,
          time: timeLabel,
        });
      } else {
        result.upcoming.push({
          title: deadline.title,
          label: due ? due.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' }) : 'Em breve',
        });
      }
    });

    return result;
  }, [snapshot, now]);

  const timelineCards = useMemo<TimelineCard[]>(() => {
    if (!snapshot) return FALLBACK_TIMELINE;

    const cards: TimelineCard[] = [];
    const focus = snapshot.data?.focus;
    const timeContext = snapshot.data?.timeContext;

    if (focus?.daily_notes?.length) {
      const bulletList = focus.daily_notes
        .slice(0, 4)
        .map((note) => `• ${note.title}`)
        .join('\n');

      cards.push({
        id: 'focus-daily',
        type: 'message',
        author: 'assistant',
        title: 'Prioridades do dia',
        body: bulletList || 'Sem notas diárias recentes.',
        timestamp: formatTimestampLabel(snapshot.generatedAt),
        actions:
          focus.daily_notes[0]?.path
            ? [{ label: 'Abrir notas', icon: <Link2 className="h-4 w-4" /> }]
            : undefined,
      });
    }

    if (focus?.weekly_focus) {
      cards.push({
        id: 'focus-weekly',
        type: 'insight',
        title: focus.weekly_focus.title || 'Foco semanal',
        body: focus.weekly_focus.excerpt || 'Resumo não disponível.',
        impact: focus.metadata?.weekly_goal || 'Prioridade semanal',
        confidence: 0.75,
        tags: focus.weekly_focus.tags || [],
        timestamp: focus.weekly_focus.modified
          ? new Date(focus.weekly_focus.modified).toLocaleString()
          : 'Esta semana',
      });
    }

    const activities = timeContext?.recent_activities || [];
    activities.slice(0, 4).forEach((activity, index) => {
      cards.push({
        id: `recent-activity-${index}`,
        type: 'note',
        title: activity.title || 'Atualização recente',
        snippet: activity.summary || activity.path || 'Alteração registrada.',
        related: activity.tags || [],
        timestamp: activity.modified
          ? new Date(activity.modified).toLocaleString()
          : 'Recente',
      });
    });

    const deadlines = timeContext?.upcoming_deadlines || [];
    if (deadlines.length > 0) {
      const summary = deadlines
        .slice(0, 3)
        .map((deadline) => {
          const dueDate = deadline.due_date ? new Date(deadline.due_date) : null;
          const label = dueDate
            ? `${dueDate.toLocaleDateString(undefined, { weekday: 'short' })} • ${dueDate.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}`
            : 'Sem data';
          return `${label} — ${deadline.title}`;
        })
        .join('\n');

      cards.push({
        id: 'upcoming-deadlines',
        type: 'agent',
        title: 'Prazos monitorados',
        status: 'scheduled',
        description: summary,
        timestamp: formatTimestampLabel(snapshot.generatedAt),
        nextRun: `${deadlines.length} próximos compromissos`,
      });
    }

    snapshot.warnings?.forEach((warning, index) => {
      cards.push({
        id: `warning-${index}`,
        type: 'message',
        author: 'assistant',
        title: `Ajuste necessário • ${warning.scope || 'Integração'}`,
        body: warning.message,
        timestamp: formatTimestampLabel(snapshot.generatedAt),
      });
    });

    return cards.length > 0 ? cards : FALLBACK_TIMELINE;
  }, [snapshot]);

  const pinnedInsights = useMemo(() => {
    const recommendations = snapshot?.data?.tasks?.summary?.recommendations;
    if (recommendations && recommendations.length > 0) {
      return recommendations.map((recommendation, index) => ({
        id: `recommendation-${index}`,
        title: `Recomendação ${index + 1}`,
        description: recommendation,
        source: 'Resumo de tarefas • Brain Cloud',
      }));
    }
    return FALLBACK_PINNED_INSIGHTS;
  }, [snapshot]);

  const agentCards = useMemo<AgentCardData[]>(() => {
    const runs = snapshot?.data?.agents?.recentRuns;
    if (runs && runs.length > 0) {
      return runs.slice(0, 3).map(buildAgentCard);
    }
    return FALLBACK_AGENT_CARDS;
  }, [snapshot]);

  const filteredTasks = useMemo(() => {
    if (activeTab !== 'tasks') return [];
    return tasksList;
  }, [activeTab, tasksList]);

  const focusHeadline = useMemo(() => {
    const firstDaily = snapshot?.data?.focus?.daily_notes?.[0]?.title;
    if (firstDaily) return firstDaily;
    const weekly = snapshot?.data?.focus?.weekly_focus?.title;
    if (weekly) return weekly;
    return 'Execução do piloto multi-tenant';
  }, [snapshot]);

  const updatedLabel = useMemo(() => {
    if (!snapshot?.generatedAt) return 'Atualizado às 07:01 pelo agente Daily Focus';
    return `Atualizado às ${formatTimestampLabel(snapshot.generatedAt)}`;
  }, [snapshot]);

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col gap-6 overflow-hidden text-zinc-100">
      <div className="flex-1 min-h-0 flex-col gap-6 xl:flex xl:flex-row xl:gap-6 xl:overflow-hidden">
        <AsideNav isCollapsed={isNavCollapsed} onToggle={() => setIsNavCollapsed((prev) => !prev)} />

        {/* Timeline + Execution */}
        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-6 xl:mt-0 xl:flex-row xl:gap-6 xl:overflow-hidden">
          {/* Timeline */}
          {!isTimelineCollapsed && (
            <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-neutral-800/60 bg-neutral-950/80 shadow-2xl shadow-black/30 xl:h-full">
              <div className="border-b border-neutral-800/60 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Foco do dia</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{focusHeadline}</h2>
                    <p className="text-xs text-zinc-500">{updatedLabel}</p>
                    {error && (
                      <p className="mt-2 text-xs text-rose-400">
                        {error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {focusSummary.map((item) => (
                      <div key={item.label} className="rounded-lg bg-neutral-900/70 px-3 py-2 text-center">
                        <p className="text-lg font-semibold text-zinc-100">{item.value}</p>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{item.label}</p>
                      </div>
                    ))}
                    <button
                      onClick={() => loadSnapshot({ silent: true })}
                      className="flex h-8 items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs font-medium uppercase tracking-wide text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                      Recarregar
                    </button>
                    <button
                      onClick={() => setIsTimelineCollapsed(true)}
                      className="hidden h-8 w-8 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100 xl:flex"
                      aria-label="Recolher timeline"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              {snapshot?.warnings && snapshot.warnings.length > 0 && (
                <div className="mx-6 mb-4 space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  {snapshot.warnings.map((warning, index) => (
                    <p key={index}>
                      <strong className="uppercase tracking-wide">{warning.scope || 'Aviso'}:</strong> {warning.message}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-400" />
                    Carregando inteligência em tempo real...
                  </div>
                ) : (
                  timelineCards.map((card) => <TimelineCard key={card.id} card={card} />)
                )}
              </div>

              <div className="sticky bottom-0 border-t border-neutral-800/60 bg-neutral-950/90 px-6 py-4 backdrop-blur">
                <div className="flex flex-col gap-3 rounded-lg border border-neutral-700 bg-neutral-950/70 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                    <span className="flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5">
                      <Sparkles className="h-3 w-3 text-emerald-300" />
                      Assistente IA ativo
                    </span>
                    <span className="flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5">
                      <Mic className="h-3 w-3 text-zinc-300" />
                      Pressione M para falar
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/90 px-4 py-3">
                      <Sparkles className="h-5 w-5 text-emerald-300" />
                      <input
                        value={composerValue}
                        onChange={(event) => setComposerValue(event.target.value)}
                        placeholder="Pergunte, capture uma nota ou gere um insight..."
                        className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                      />
                    </div>
                    <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-800">
                      <Mic className="h-5 w-5 text-zinc-200" />
                    </button>
                    <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-800">
                      <FilePlus2 className="h-5 w-5 text-zinc-200" />
                    </button>
                    <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-200 text-zinc-950 transition hover:border-neutral-500 hover:bg-neutral-100">
                      <Play className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>
                      Use <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">/nota</kbd>{' '}
                      <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">/tarefa</kbd>{' '}
                      <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">/resumo</kbd>
                    </span>
                    <span>{composerValue.length}/500</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {isTimelineCollapsed && (
            <div className="hidden xl:flex xl:flex-col xl:items-start xl:justify-start xl:pt-2">
              <button
                onClick={() => setIsTimelineCollapsed(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-300 shadow-lg shadow-black/20 transition hover:border-neutral-600 hover:text-zinc-100"
                aria-label="Exibir timeline"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Execution Panel */}
          <aside
            className={`flex h-[520px] flex-col space-y-4 rounded-xl border border-neutral-800/60 bg-neutral-950/80 p-5 shadow-2xl shadow-black/30 xl:h-full xl:overflow-hidden ${
              isTimelineCollapsed ? 'xl:flex-1' : 'xl:w-[320px]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Execução</h3>
              <button className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:bg-neutral-800">
                <ClipboardCheck className="h-4 w-4 text-zinc-200" />
                Ver tudo
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 rounded-lg border border-neutral-800 bg-neutral-950 p-1">
              {[
                { id: 'tasks', label: 'Tarefas' },
                { id: 'agenda', label: 'Agenda' },
                { id: 'insights', label: 'Insights' },
                { id: 'agents', label: 'Agentes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-neutral-800 text-zinc-100'
                      : 'text-zinc-400 hover:bg-neutral-900 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  {filteredTasks.length === 0 && (
                    <p className="text-xs text-zinc-500">
                      Nenhuma tarefa disponível agora. Use os agentes ou o foco diário para gerar próximas ações.
                    </p>
                  )}
                  {filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-left transition hover:border-neutral-600 hover:bg-neutral-900"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-semibold text-zinc-100">{task.title}</p>
                        <CheckCircle
                        className={`h-5 w-5 ${
                          task.status === 'overdue'
                            ? 'text-rose-400'
                            : task.status === 'today'
                            ? 'text-amber-300'
                            : 'text-zinc-500'
                        }`}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                        {task.dueDate && (
                          <span className="rounded-full border border-neutral-800 px-2 py-0.5">
                            Prazo {formatDateShort(task.dueDate)}
                          </span>
                        )}
                        {task.dueTime && (
                          <span className="rounded-full border border-neutral-800 px-2 py-0.5">
                            {formatTimeShort(task.dueTime)}
                          </span>
                        )}
                        {task.project && (
                          <span className="rounded-full border border-neutral-800 px-2 py-0.5">{task.project}</span>
                        )}
                        {task.priority && (
                          <span
                            className={`rounded-full border px-2 py-0.5 ${
                              task.priority === 'high'
                                ? 'border-rose-400/60 text-rose-200'
                                : task.priority === 'medium'
                                ? 'border-amber-400/60 text-amber-200'
                                : 'border-neutral-700/60'
                            }`}
                          >
                            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'agenda' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Hoje</p>
                    <div className="mt-3 space-y-2 text-sm text-zinc-200">
                      {agendaBuckets.today.length > 0 ? (
                        agendaBuckets.today.map((item, index) => (
                          <p key={index}>
                            {item.time ? `${item.time} • ` : ''}
                            {item.title}
                          </p>
                        ))
                      ) : (
                        <p>Nenhum compromisso crítico para hoje.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Próximos dias</p>
                    <div className="mt-3 space-y-2 text-sm text-zinc-200">
                      {agendaBuckets.upcoming.length > 0 ? (
                        agendaBuckets.upcoming.map((item, index) => (
                          <p key={index}>
                            {item.label} • {item.title}
                          </p>
                        ))
                      ) : (
                        <p>Sem prazos relevantes nos próximos dias.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-3">
                  {pinnedInsights.map((insight) => (
                    <div key={insight.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                      <p className="text-sm font-semibold text-zinc-100">{insight.title}</p>
                      <p className="mt-2 text-sm text-zinc-300">{insight.description}</p>
                      <p className="mt-3 text-[11px] uppercase tracking-wide text-zinc-500">{insight.source}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'agents' && (
                <div className="space-y-3">
                  {agentCards.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
                          {agent.icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{agent.name}</p>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            {agent.status} • {agent.time}
                          </p>
                        </div>
                      </div>
                      <button className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:bg-neutral-800">
                        Executar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

type TimelineCardProps = {
  card: TimelineCard;
};

const TimelineCard: React.FC<TimelineCardProps> = ({ card }) => {
  if (card.type === 'message') {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-lg shadow-black/20 transition hover:border-neutral-600 hover:shadow-black/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-200">{card.title}</p>
            <p className="mt-3 whitespace-pre-line text-sm text-zinc-300">{card.body}</p>
          </div>
          <span className="text-xs uppercase tracking-wide text-zinc-500">{card.timestamp}</span>
        </div>
        {card.actions && (
          <div className="mt-4 flex flex-wrap gap-2">
            {card.actions.map((action, index) => (
              <button
                key={index}
                className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-900"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (card.type === 'insight') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg shadow-emerald-500/10 transition hover:border-emerald-400/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-emerald-200">Insight IA</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-3 text-sm text-emerald-100/90">{card.body}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-100/80">
              {card.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-emerald-200/40 px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs uppercase tracking-wide text-emerald-200/70">{card.timestamp}</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-emerald-100/80">
          <span>{card.impact}</span>
          <span>Confiança {(card.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    );
  }

  if (card.type === 'note') {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-lg shadow-black/15 transition hover:border-neutral-600 hover:shadow-black/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Nota criada</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-3 text-sm text-zinc-300">{card.snippet}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
              {card.related.map((item) => (
                <button key={item} className="rounded-full border border-neutral-800 px-3 py-1 transition hover:border-neutral-600">
                  {item}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs uppercase tracking-wide text-zinc-500">{card.timestamp}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5 shadow-lg shadow-sky-500/10 transition hover:border-sky-400/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-sky-200">Agente</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{card.title}</h3>
          <p className="mt-3 text-sm text-sky-100/90">{card.description}</p>
          {card.nextRun && <p className="mt-3 text-xs uppercase tracking-wide text-sky-200/80">{card.nextRun}</p>}
        </div>
        <span className="text-xs uppercase tracking-wide text-sky-200/80">{card.timestamp}</span>
      </div>
    </div>
  );
};

export default BusinessIntelligenceHub;

type AsideNavProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

const AsideNav: React.FC<AsideNavProps> = ({ isCollapsed, onToggle }) => {
  const [navOpen, setNavOpen] = useState(true);
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const quickActionsOpen = true;
  const { openSettings } = useSettingsModal();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    if (isCollapsed) {
      setUserMenuOpen(false);
    }
  }, [isCollapsed]);

  return (
    <aside
      className={`flex h-full flex-col rounded-xl border border-neutral-800/60 bg-neutral-950/90 shadow-lg shadow-black/20 transition-all duration-300 ${
        isCollapsed ? 'xl:w-20' : 'xl:w-64'
      }`}
    >
      <div className="flex-1 overflow-y-auto space-y-5 px-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-zinc-200">
            <Sparkles className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold text-zinc-100">GG.AI Labs</p>
              <p className="text-xs text-zinc-500">CEO Dashboard</p>
            </div>
          )}
          <button
            onClick={onToggle}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
            aria-label={isCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => !isCollapsed && setNavOpen((prev) => !prev)}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 transition ${
              isCollapsed ? 'cursor-default justify-center text-[11px]' : 'hover:text-zinc-300'
            }`}
          >
            <span>{isCollapsed ? '≡' : 'Visões'}</span>
            {!isCollapsed && (
              <ChevronDown
                className={`h-4 w-4 transition ${navOpen ? '' : '-rotate-90'}`}
              />
            )}
          </button>
          {(navOpen || isCollapsed) && (
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className={`group flex w-full items-center rounded-lg px-3 py-2 text-sm transition ${
                    item.active
                      ? 'bg-neutral-900 text-zinc-50 border border-neutral-700'
                      : 'text-zinc-400 hover:bg-neutral-900/70 hover:text-zinc-100 border border-transparent'
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900/80">
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <>
                      <span className="ml-3 font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full border border-neutral-700 bg-neutral-950 px-2 py-0.5 text-xs text-zinc-300">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="space-y-2">
          <button
            onClick={() => !isCollapsed && setCollectionsOpen((prev) => !prev)}
            className={`flex w-full items-center justify-between rounded-xl px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 transition ${
              isCollapsed ? 'cursor-default justify-center text-[11px]' : 'hover:text-zinc-300'
            }`}
          >
            <span>{isCollapsed ? '★' : 'Coleções'}</span>
            {!isCollapsed && (
              <ChevronDown
                className={`h-4 w-4 transition ${collectionsOpen ? '' : '-rotate-90'}`}
              />
            )}
          </button>
          {(collectionsOpen || isCollapsed) && (
            <div className="space-y-1">
              {navCollections.map((collection) => (
                <button
                  key={collection.label}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-200 transition hover:bg-neutral-900/70"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/70">
                    {collection.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{collection.label}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto border-t border-neutral-800/60 px-4 py-5">
        {(quickActionsOpen || isCollapsed) && (
          <div className="grid grid-cols-3 gap-1.5">
            <button
              title="Nova nota (⌘+N)"
              className="flex h-10 items-center justify-center rounded-lg border border-dashed border-neutral-600 bg-neutral-900 text-zinc-200 transition hover:border-neutral-500"
            >
              <FilePlus2 className="h-4 w-4" />
            </button>
            <button
              title="Capturar áudio"
              className="flex h-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-900"
            >
              <Headphones className="h-4 w-4" />
            </button>
            <button
              title="Importar mídia"
              className="flex h-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-900"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="relative mt-4" ref={menuRef}>
          <button
            onClick={() => {
              if (isCollapsed) {
                openSettings();
                return;
              }
              setUserMenuOpen((prev) => !prev);
            }}
            className={`flex w-full items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-left transition hover:border-neutral-600 hover:bg-neutral-900 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
              <UserAvatar />
            </div>
            {!isCollapsed && (
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-zinc-100">Guilherme Giorgi</p>
                <p className="text-xs text-zinc-500">vectal.free@gg.ai</p>
              </div>
            )}
            {!isCollapsed && (
              <ChevronDown
                className={`h-4 w-4 text-zinc-500 transition ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>

          {userMenuOpen && (
            <div className={`absolute bottom-16 ${isCollapsed ? '-left-1' : 'left-0'} z-50 w-64 rounded-2xl border border-neutral-800 bg-neutral-950/95 shadow-2xl shadow-black/30`}>
              <div className="border-b border-neutral-800 px-4 py-3 text-sm">
                <p className="font-medium text-zinc-100">gui.agro@gmail.com</p>
                <p className="text-xs text-zinc-500">GG.AI Labs • Vectal Free</p>
              </div>
              <div className="flex flex-col py-2">
                <MenuItem
                  icon={<Settings className="h-4 w-4 text-zinc-300" />}
                  label="Advanced Settings"
                  onClick={() => {
                    openSettings();
                    setUserMenuOpen(false);
                  }}
                />
                <MenuItem
                  icon={<Sparkles className="h-4 w-4 text-emerald-300" />}
                  label="Upgrade Plan"
                  badge="NEW"
                  onClick={() => setUserMenuOpen(false)}
                />
                <MenuItem
                  icon={<User className="h-4 w-4 text-sky-300" />}
                  label="User Context"
                  onClick={() => setUserMenuOpen(false)}
                />
                <MenuItem
                  icon={<LogOut className="h-4 w-4 text-rose-300" />}
                  label="Logout"
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = '/login';
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

const UserAvatar: React.FC = () => (
  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 via-slate-400 to-slate-300 text-zinc-950 text-sm font-semibold">
    GG
  </span>
);

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: string;
};

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, badge }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-200 transition hover:bg-neutral-900"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
      {icon}
    </span>
    <span className="flex-1 text-left">{label}</span>
    {badge && (
      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
        {badge}
      </span>
    )}
  </button>
);
