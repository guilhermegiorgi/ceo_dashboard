'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  Edit3,
  Flag,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import apiClient, {
  SynergyInsight,
} from '../services/apiClient';

type SessionStatus = 'suggested' | 'scheduled' | 'completed' | 'cancelled';
type SessionPriority = 'high' | 'medium' | 'low';

type StrategicSession = {
  id: string;
  title: string;
  type: string;
  description: string;
  suggestedDuration: number;
  participants: string[];
  preparationNotes: string[];
  expectedOutcomes: string[];
  priority: SessionPriority;
  triggerInsight?: string | null;
  scheduledDate?: string | null;
  status: SessionStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type SessionFormState = {
  id?: string | null;
  title: string;
  type: string;
  description: string;
  suggestedDuration: number;
  priority: SessionPriority;
  participants: string;
  preparationNotes: string;
  expectedOutcomes: string;
  triggerInsight: string;
};

const defaultFormState: SessionFormState = {
  id: null,
  title: '',
  type: 'strategic_alignment',
  description: '',
  suggestedDuration: 90,
  priority: 'high',
  participants: '',
  preparationNotes: '',
  expectedOutcomes: '',
  triggerInsight: '',
};

const statusLabels: Record<SessionStatus, string> = {
  suggested: 'Sugerida',
  scheduled: 'Agendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const statusStyles: Record<SessionStatus, string> = {
  suggested:
    'border-sky-500/30 bg-sky-500/10 text-sky-200',
  scheduled:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  completed:
    'border-purple-500/30 bg-purple-500/10 text-purple-200',
  cancelled:
    'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

const priorityLabels: Record<SessionPriority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const priorityStyles: Record<SessionPriority, string> = {
  high: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  medium: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  low: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
};

const sessionTypes = [
  { value: 'strategic_alignment', label: 'Alinhamento estratégico' },
  { value: 'synergy_exploration', label: 'Explorar sinergias' },
  { value: 'gap_analysis', label: 'Análise de lacunas' },
  { value: 'pattern_validation', label: 'Validação de padrões' },
  { value: 'innovation_sprint', label: 'Sprint de inovação' },
];

const plannerFieldClass =
  'w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60';

const plannerLabelClass = 'text-sm font-medium text-zinc-300';

const plannerDescriptionClass = 'text-xs text-zinc-500';

const mapSessionFromApi = (session: any): StrategicSession => ({
  id: String(session.id),
  title: session.title ?? '',
  type: session.type ?? 'strategic_alignment',
  description: session.description ?? '',
  suggestedDuration: Number(session.suggested_duration ?? 90),
  participants: Array.isArray(session.participants)
    ? session.participants.map(String)
    : [],
  preparationNotes: Array.isArray(session.preparation_notes)
    ? session.preparation_notes.map(String)
    : [],
  expectedOutcomes: Array.isArray(session.expected_outcomes)
    ? session.expected_outcomes.map(String)
    : [],
  priority: (session.priority ?? 'high') as SessionPriority,
  triggerInsight: session.trigger_insight ?? '',
  scheduledDate: session.scheduled_date ?? null,
  status: (session.status ?? 'suggested') as SessionStatus,
  createdAt: session.created_at ?? null,
  updatedAt: session.updated_at ?? null,
});

const mapFormToPayload = (form: SessionFormState) => ({
  title: form.title.trim(),
  type: form.type,
  description: form.description.trim(),
  suggested_duration: form.suggestedDuration,
  priority: form.priority,
  participants: splitTextArea(form.participants),
  preparation_notes: splitTextArea(form.preparationNotes),
  expected_outcomes: splitTextArea(form.expectedOutcomes),
  trigger_insight: form.triggerInsight.trim() || null,
});

function splitTextArea(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const formatDateForInput = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForHuman = (value: string | null | undefined) => {
  if (!value) return 'Não agendada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getWeekAgenda = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const key = formatDateForInput(date.toISOString());
    return {
      key,
      label: date.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
      }),
      fullLabel: date.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      date,
    };
  });
};

const StrategicSessionPlanner: React.FC = () => {
  const [sessions, setSessions] = useState<StrategicSession[]>([]);
  const [insights, setInsights] = useState<SynergyInsight[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [formState, setFormState] =
    useState<SessionFormState>(defaultFormState);
  const [formOpen, setFormOpen] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [scheduleTarget, setScheduleTarget] =
    useState<StrategicSession | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>(() =>
    formatDateForInput(new Date().toISOString())
  );

  const agenda = useMemo(getWeekAgenda, []);

  const sessionsByStatus = useMemo(() => {
    const buckets: Record<SessionStatus, StrategicSession[]> = {
      suggested: [],
      scheduled: [],
      completed: [],
      cancelled: [],
    };
    sessions.forEach((session) => {
      buckets[session.status ?? 'suggested'].push(session);
    });
    return buckets;
  }, [sessions]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, StrategicSession[]>();
    agenda.forEach((day) => map.set(day.key, []));
    sessions
      .filter((session) => session.scheduledDate)
      .forEach((session) => {
        const key = formatDateForInput(session.scheduledDate);
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)?.push(session);
      });
    return map;
  }, [sessions, agenda]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await apiClient.getSessions({ status: 'all' });
      const normalized = (Array.isArray(response) ? response : []).map(
        mapSessionFromApi
      );
      setSessions(
        normalized.sort((a, b) => {
          const aDate = a.scheduledDate
            ? new Date(a.scheduledDate).getTime()
            : Infinity;
          const bDate = b.scheduledDate
            ? new Date(b.scheduledDate).getTime()
            : Infinity;
          return aDate - bDate;
        })
      );
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Não foi possível carregar as sessões estratégicas.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await apiClient.getInsights();
      setInsights(response.slice(0, 4));
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchInsights();
  }, []);

  const openCreateForm = () => {
    setFormState(defaultFormState);
    setFormOpen(true);
  };

  const openEditForm = (session: StrategicSession) => {
    setFormState({
      id: session.id,
      title: session.title,
      type: session.type,
      description: session.description,
      suggestedDuration: session.suggestedDuration,
      priority: session.priority,
      participants: session.participants.join('\n'),
      preparationNotes: session.preparationNotes.join('\n'),
      expectedOutcomes: session.expectedOutcomes.join('\n'),
      triggerInsight: session.triggerInsight ?? '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (savingSession) return;
    setFormOpen(false);
    setFormState(defaultFormState);
  };

  const handleFormChange = <
    Field extends keyof SessionFormState,
    Value extends SessionFormState[Field]
  >(
    field: Field,
    value: Value
  ) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      toast.error('Informe um título para a sessão.');
      return;
    }
    setSavingSession(true);
    try {
      const payload = mapFormToPayload(formState);
      if (formState.id) {
        await apiClient.updateSession(formState.id, payload);
        toast.success('Sessão atualizada com sucesso.');
      } else {
        await apiClient.createSession(payload);
        toast.success('Sessão criada com sucesso.');
      }
      closeForm();
      fetchSessions();
    } catch (error) {
      console.error('Failed to save session:', error);
      toast.error('Não foi possível salvar a sessão.');
    } finally {
      setSavingSession(false);
    }
  };

  const handleSchedule = (session: StrategicSession) => {
    setScheduleTarget(session);
    setScheduleDate(
      formatDateForInput(session.scheduledDate || new Date().toISOString())
    );
  };

  const confirmSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleTarget || !scheduleDate) {
      toast.error('Informe a data para agendamento.');
      return;
    }
    try {
      await apiClient.scheduleSession(scheduleTarget.id, scheduleDate);
      toast.success('Sessão agendada.');
      setScheduleTarget(null);
      fetchSessions();
    } catch (error) {
      console.error('Failed to schedule session:', error);
      toast.error('Não foi possível agendar a sessão.');
    }
  };

  const markAsCompleted = async (session: StrategicSession) => {
    try {
      await apiClient.updateSession(session.id, { status: 'completed' });
      toast.success('Sessão marcada como concluída.');
      fetchSessions();
    } catch (error) {
      console.error('Failed to complete session:', error);
      toast.error('Não foi possível atualizar o status.');
    }
  };

  const cancelSession = async (session: StrategicSession) => {
    const confirmed = window.confirm(
      `Cancelar sessão "${session.title}"? Esta ação pode ser revertida editando o status.`
    );
    if (!confirmed) return;
    try {
      await apiClient.updateSession(session.id, { status: 'cancelled' });
      toast.success('Sessão cancelada.');
      fetchSessions();
    } catch (error) {
      console.error('Failed to cancel session:', error);
      toast.error('Não foi possível cancelar a sessão.');
    }
  };

  const sessionSummary = useMemo(() => {
    const total = sessions.length;
    const scheduled = sessionsByStatus.scheduled.length;
    const completed = sessionsByStatus.completed.length;
    const pending = sessionsByStatus.suggested.length;
    return { total, scheduled, completed, pending };
  }, [sessions.length, sessionsByStatus]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-6 shadow-inner shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-zinc-100">
            <CalendarRange className="h-6 w-6 text-emerald-400" />
            Strategic Session Planner
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Orquestre sessões estratégicas, acompanhe agendas semanais e
            conecte decisões com insights de alto impacto.
          </p>
        </div>
        <div className="grid w-full gap-3 text-sm text-zinc-200 sm:grid-cols-2 lg:w-auto">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Sessões ativas
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">
              {sessionSummary.total}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Próximas 7 dias
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-300">
              {sessionsByStatus.scheduled.length}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">
                Sessões estratégicas
              </h3>
              <p className="text-sm text-zinc-500">
                Controle total das iniciativas em andamento.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchSessions}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/60 hover:text-emerald-300"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" />
                Nova sessão
              </button>
            </div>
          </div>

          {loadingSessions ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              <p className="text-sm text-zinc-500">
                Carregando sessões estratégicas...
              </p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center">
              <Sparkles className="h-8 w-8 text-zinc-600" />
              <p className="font-medium text-zinc-300">
                Nenhuma sessão registrada ainda
              </p>
              <p className="text-sm text-zinc-500">
                Crie a primeira sessão para alinhar times, analisar oportunidades
                ou acelerar decisões.
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/60 hover:text-emerald-300"
              >
                <Plus className="h-4 w-4" />
                Planejar sessão
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-inner shadow-black/20 transition hover:border-emerald-500/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[session.status]}`}
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          {statusLabels[session.status]}
                        </span>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${priorityStyles[session.priority]}`}
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Prioridade {priorityLabels[session.priority]}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs text-zinc-400">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" />
                          {session.suggestedDuration} min
                        </span>
                      </div>

                      <h4 className="text-lg font-semibold text-zinc-100">
                        {session.title}
                      </h4>
                      <p className="text-sm text-zinc-400">
                        {session.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <div className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-zinc-500" />
                          {formatDateForHuman(session.scheduledDate)}
                        </div>
                        {session.triggerInsight && (
                          <div className="inline-flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
                            {session.triggerInsight}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                      <button
                        type="button"
                        onClick={() => handleSchedule(session)}
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/60 hover:text-emerald-300"
                      >
                        <CalendarDays className="h-3 w-3" />
                        Agendar
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(session)}
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/60 hover:text-emerald-300"
                      >
                        <Edit3 className="h-3 w-3" />
                        Editar
                      </button>
                      {session.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => markAsCompleted(session)}
                          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/60 hover:text-emerald-300"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Concluir
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => cancelSession(session)}
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs font-medium text-rose-300 transition hover:border-rose-500/50 hover:text-rose-200"
                      >
                        <Trash2 className="h-3 w-3" />
                        Cancelar
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-neutral-800 pt-4 text-sm text-zinc-300 md:grid-cols-3">
                    <div>
                      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
                        <Users className="h-3.5 w-3.5" />
                        Participantes
                      </p>
                      <ul className="mt-1 space-y-1 text-xs text-zinc-400">
                        {session.participants.map((participant) => (
                          <li key={participant}>• {participant}</li>
                        ))}
                        {session.participants.length === 0 && (
                          <li className="text-zinc-500">
                            Defina os participantes na edição da sessão.
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
                        <Target className="h-3.5 w-3.5" />
                        Preparação
                      </p>
                      <ul className="mt-1 space-y-1 text-xs text-zinc-400">
                        {session.preparationNotes.map((note) => (
                          <li key={note}>• {note}</li>
                        ))}
                        {session.preparationNotes.length === 0 && (
                          <li className="text-zinc-500">
                            Liste tarefas de preparação para maximizar o
                            alinhamento.
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
                        <Sparkles className="h-3.5 w-3.5" />
                        Resultados esperados
                      </p>
                      <ul className="mt-1 space-y-1 text-xs text-zinc-400">
                        {session.expectedOutcomes.map((outcome) => (
                          <li key={outcome}>• {outcome}</li>
                        ))}
                        {session.expectedOutcomes.length === 0 && (
                          <li className="text-zinc-500">
                            Defina outcomes claros para medir o impacto da
                            sessão.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-inner shadow-black/20">
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
              <CalendarDays className="h-5 w-5 text-emerald-400" />
              Agenda da semana
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Visualize rapidamente as sessões agendadas para os próximos 7
              dias.
            </p>
            <div className="mt-4 space-y-3">
              {agenda.map((day) => {
                const daySessions = sessionsByDay.get(day.key) || [];
                return (
                  <div
                    key={day.key}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3"
                  >
                    <p className="flex items-center justify-between text-xs font-medium text-zinc-400">
                      <span>{day.fullLabel}</span>
                      <span className="text-zinc-500">
                        {daySessions.length} sessão(ões)
                      </span>
                    </p>
                    <ul className="mt-2 space-y-2 text-xs text-zinc-300">
                      {daySessions.length === 0 ? (
                        <li className="text-zinc-500">
                          Nenhuma sessão programada.
                        </li>
                      ) : (
                        daySessions.map((session) => (
                          <li
                            key={session.id}
                            className="rounded border border-neutral-800 bg-neutral-900/70 px-3 py-2"
                          >
                            <p className="font-semibold text-zinc-200">
                              {session.title}
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                              <Clock className="h-3 w-3" />
                              {session.suggestedDuration} min •{' '}
                              {priorityLabels[session.priority]}
                            </p>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-inner shadow-black/20">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                Insights recentes
              </h3>
              {loadingInsights && (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Utilize estes insights como ponto de partida para novas sessões.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              {insights.length === 0 ? (
                <li className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-zinc-500">
                  Gere insights estratégicos para acionar sessões mais eficazes.
                </li>
              ) : (
                insights.map((insight) => (
                  <li
                    key={insight.id ?? insight.title}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3"
                  >
                    <p className="font-medium text-zinc-100">
                      {insight.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Confiança{' '}
                      {(insight.confidence ?? 0).toLocaleString(undefined, {
                        style: 'percent',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          triggerInsight: insight.title,
                        }))
                      }
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-emerald-500/50 hover:text-emerald-300"
                    >
                      Vincular à sessão
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 text-sm text-zinc-400">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-400" />
              <span>
                Consulte insights e notas do Brain Cloud diretamente na sessão
                para garantir que decisões estratégicas estejam alinhadas com o
                contexto atualizado.
              </span>
            </p>
          </div>
        </aside>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="relative w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-neutral-800 bg-neutral-900/70 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  {formState.id ? 'Editar sessão' : 'Nova sessão estratégica'}
                </h3>
                <p className="text-sm text-zinc-500">
                  Defina propósito, participantes e resultados esperados.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full border border-neutral-800 bg-neutral-900 p-2 text-zinc-400 transition hover:border-emerald-500/60 hover:text-emerald-300"
                aria-label="Fechar formulário"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleSubmitSession} className="max-h-[75vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2 space-y-1.5">
                  <label htmlFor="session-title" className={plannerLabelClass}>
                    Título
                  </label>
                  <input
                    id="session-title"
                    type="text"
                    required
                    placeholder="Ex.: Alinhamento OKRs Q2"
                    className={plannerFieldClass}
                    value={formState.title}
                    onChange={(event) =>
                      handleFormChange('title', event.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="session-type" className={plannerLabelClass}>
                    Tipo de sessão
                  </label>
                  <select
                    id="session-type"
                    className={plannerFieldClass}
                    value={formState.type}
                    onChange={(event) =>
                      handleFormChange(
                        'type',
                        event.target.value as SessionFormState['type']
                      )
                    }
                  >
                    {sessionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="session-priority"
                    className={plannerLabelClass}
                  >
                    Prioridade
                  </label>
                  <select
                    id="session-priority"
                    className={plannerFieldClass}
                    value={formState.priority}
                    onChange={(event) =>
                      handleFormChange(
                        'priority',
                        event.target.value as SessionPriority
                      )
                    }
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="session-duration"
                    className={plannerLabelClass}
                  >
                    Duração sugerida (min)
                  </label>
                  <input
                    id="session-duration"
                    type="number"
                    min={30}
                    step={15}
                    className={plannerFieldClass}
                    value={formState.suggestedDuration}
                    onChange={(event) =>
                      handleFormChange(
                        'suggestedDuration',
                        Number(event.target.value)
                      )
                    }
                  />
                  <p className={plannerDescriptionClass}>
                    Recomendamos múltiplos de 30 minutos para facilitar agenda.
                  </p>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label
                    htmlFor="session-description"
                    className={plannerLabelClass}
                  >
                    Objetivo da sessão
                  </label>
                  <textarea
                    id="session-description"
                    required
                    rows={3}
                    placeholder="Contextualize o problema ou oportunidade e defina o objetivo principal."
                    className={plannerFieldClass}
                    value={formState.description}
                    onChange={(event) =>
                      handleFormChange('description', event.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label
                    htmlFor="session-participants"
                    className={plannerLabelClass}
                  >
                    Participantes (1 por linha)
                  </label>
                  <textarea
                    id="session-participants"
                    rows={3}
                    placeholder="CEO&#10;CTO&#10;Diretor de Estratégia"
                    className={plannerFieldClass}
                    value={formState.participants}
                    onChange={(event) =>
                      handleFormChange('participants', event.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label
                    htmlFor="session-preparation"
                    className={plannerLabelClass}
                  >
                    Preparação (1 por linha)
                  </label>
                  <textarea
                    id="session-preparation"
                    rows={3}
                    placeholder="Revisar nota de oportunidades Agro SaaS&#10;Atualizar KPIs trimestrais&#10;Trazer pipeline de parcerias"
                    className={plannerFieldClass}
                    value={formState.preparationNotes}
                    onChange={(event) =>
                      handleFormChange('preparationNotes', event.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label
                    htmlFor="session-outcomes"
                    className={plannerLabelClass}
                  >
                    Resultados esperados (1 por linha)
                  </label>
                  <textarea
                    id="session-outcomes"
                    rows={3}
                    placeholder="Definir decisão go/no-go do piloto&#10;Listar responsáveis e milestones&#10;Estabelecer métricas de sucesso"
                    className={plannerFieldClass}
                    value={formState.expectedOutcomes}
                    onChange={(event) =>
                      handleFormChange('expectedOutcomes', event.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label
                    htmlFor="session-insight"
                    className={plannerLabelClass}
                  >
                    Insight relacionado
                  </label>
                  <input
                    id="session-insight"
                    type="text"
                    placeholder="Ex.: Insight IA - Onboarding Cooperativas"
                    className={plannerFieldClass}
                    value={formState.triggerInsight}
                    onChange={(event) =>
                      handleFormChange('triggerInsight', event.target.value)
                    }
                  />
                  <p className={plannerDescriptionClass}>
                    Vincule a sessões originadas por insights para rastrear
                    impacto no Brain Cloud.
                  </p>
                </div>
              </div>

              <footer className="mt-6 flex flex-col gap-3 border-t border-neutral-800 pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-zinc-500">
                  Sessões são sincronizadas com o backend (SQLite) e podem ser
                  integradas ao Brain Cloud posteriormente.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-neutral-600 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-60"
                    disabled={savingSession}
                  >
                    {savingSession ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {formState.id ? 'Salvar alterações' : 'Criar sessão'}
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </div>
      )}

      {scheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 shadow-lg">
            <form onSubmit={confirmSchedule}>
              <header className="flex items-start justify-between border-b border-neutral-800 bg-neutral-900/70 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    Agendar sessão
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {scheduleTarget.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleTarget(null)}
                  className="rounded-full border border-neutral-800 bg-neutral-900 p-1 text-zinc-400 transition hover:border-emerald-500/60 hover:text-emerald-300"
                  aria-label="Fechar agendamento"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="space-y-4 px-5 py-5">
                <div className="space-y-1.5">
                  <label htmlFor="schedule-date" className={plannerLabelClass}>
                    Data
                  </label>
                  <input
                    id="schedule-date"
                    type="date"
                    className={plannerFieldClass}
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    required
                  />
                  <p className={plannerDescriptionClass}>
                    A sessão ficará disponível na agenda semanal e no histórico
                    de decisões.
                  </p>
                </div>
              </div>
              <footer className="flex items-center justify-end gap-2 border-t border-neutral-800 bg-neutral-900/70 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setScheduleTarget(null)}
                  className="rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-neutral-600 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default StrategicSessionPlanner;
