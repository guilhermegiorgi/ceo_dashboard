'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Loader2,
  Target,
} from 'lucide-react';
import apiClient from '@/services/apiClient';

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  progress?: number | null;
  team_size?: number | null;
  budget?: string | null;
  deadline?: string | null;
  priority?: string | null;
  roi?: string | null;
};

type StatusFilter = 'all' | 'planning' | 'on_track' | 'at_risk' | 'delayed';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

const statusLabels: Record<Exclude<StatusFilter, 'all'>, string> = {
  planning: 'Planejamento',
  on_track: 'No prazo',
  at_risk: 'Em risco',
  delayed: 'Atrasado',
};

const statusStyles: Record<Exclude<StatusFilter, 'all'>, string> = {
  planning: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  on_track: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  at_risk: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  delayed: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
};

const normalizeStatus = (status?: string | null): StatusFilter => {
  const value = (status || '').toLowerCase();
  if (value.includes('risk')) return 'at_risk';
  if (value.includes('delay')) return 'delayed';
  if (value.includes('track') || value.includes('active')) return 'on_track';
  if (value.includes('plan')) return 'planning';
  return 'on_track';
};

const normalizePriority = (priority?: string | null): PriorityFilter => {
  const value = (priority || '').toLowerCase();
  if (value.startsWith('hi')) return 'high';
  if (value.startsWith('lo')) return 'low';
  if (value) return 'medium';
  return 'medium';
};

const ProjectOverview: React.FC = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  useEffect(() => {
    let mounted = true;
    const loadProjects = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getProjects();
        if (!mounted) return;
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load projects overview', error);
        toast.error('Não foi possível carregar os projetos.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadProjects();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const normalizedStatus = normalizeStatus(project.status);
      const normalizedPriority = normalizePriority(project.priority);
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && normalizedPriority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [projects, statusFilter, priorityFilter]);

  const summary = useMemo(() => {
    if (projects.length === 0) {
      return {
        total: 0,
        onTrack: 0,
        atRisk: 0,
        dueSoon: 0,
      };
    }
    let onTrack = 0;
    let atRisk = 0;
    let dueSoon = 0;
    const now = Date.now();

    projects.forEach((project) => {
      const normalizedStatus = normalizeStatus(project.status);
      if (normalizedStatus === 'on_track' || normalizedStatus === 'planning') {
        onTrack += 1;
      }
      if (normalizedStatus === 'at_risk' || normalizedStatus === 'delayed') {
        atRisk += 1;
      }

      if (project.deadline) {
        const deadline = new Date(project.deadline).getTime();
        if (!Number.isNaN(deadline) && deadline > now) {
          const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
          if (diffDays <= 14) {
            dueSoon += 1;
          }
        }
      }
    });

    return {
      total: projects.length,
      onTrack,
      atRisk,
      dueSoon,
    };
  }, [projects]);

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-4 shadow-inner shadow-black/30 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
            <Target className="h-5 w-5 text-emerald-400" />
            Project Overview
          </h3>
          <p className="text-sm text-zinc-400">
            Panorama executivo dos projetos ativos, progresso e riscos
            emergentes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/60 hover:text-emerald-300"
        >
          Ver detalhes
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Projetos ativos"
          value={summary.total}
          description="Total de iniciativas em acompanhamento"
          tone="default"
        />
        <SummaryCard
          label="No ritmo planejado"
          value={summary.onTrack}
          description="Planejamento alinhado com milestones"
          tone="success"
        />
        <SummaryCard
          label="Ativos críticos"
          value={summary.atRisk}
          description="Projetos com risco ou atraso"
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-zinc-500" />
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
          <option value="planning">Planejamento</option>
          <option value="on_track">No prazo</option>
          <option value="at_risk">Em risco</option>
          <option value="delayed">Atrasado</option>
        </select>
        <select
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          value={priorityFilter}
          onChange={(event) =>
            setPriorityFilter(event.target.value as PriorityFilter)
          }
        >
          <option value="all">Todas as prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          Carregando visão geral dos projetos...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-6 text-center text-sm text-zinc-500">
          Nenhum projeto corresponde aos filtros selecionados.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredProjects.map((project) => {
            const normalizedStatus = normalizeStatus(project.status);
            const statusBadge = statusStyles[normalizedStatus] ?? statusStyles.on_track;
            const progressValue = Math.min(
              100,
              Math.max(0, project.progress ?? 0)
            );
            const priority = normalizePriority(project.priority);

            const deadlineLabel = project.deadline
              ? new Date(project.deadline).toLocaleDateString()
              : 'Sem data';

            return (
              <article
                key={project.id}
                className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 transition hover:border-emerald-500/40 hover:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-zinc-100">
                    {project.name}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] ${statusBadge}`}
                  >
                    {statusLabels[normalizedStatus] ?? 'Em andamento'}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-zinc-400 line-clamp-3">
                    {project.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Progresso</span>
                    <span>{progressValue}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full border border-neutral-800 bg-neutral-900">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                </div>

                <dl className="grid gap-3 text-xs text-zinc-400 md:grid-cols-2">
                  <div>
                    <dt className="uppercase tracking-wide text-zinc-500">
                      Deadline
                    </dt>
                    <dd className="mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      {deadlineLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-zinc-500">
                      Budget
                    </dt>
                    <dd className="mt-1 text-zinc-300">
                      {project.budget ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-zinc-500">
                      Prioridade
                    </dt>
                    <dd className="mt-1 capitalize">{priority}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-zinc-500">
                      ROI estimado
                    </dt>
                    <dd className="mt-1 text-zinc-300">
                      {project.roi ?? '—'}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

type SummaryCardProps = {
  label: string;
  value: number;
  description: string;
  tone: 'default' | 'success' | 'warning';
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  description,
  tone,
}) => {
  const toneStyles =
    tone === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : tone === 'warning'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
      : 'border-neutral-800 bg-neutral-950/90 text-zinc-100';

  return (
    <div
      className={`rounded-2xl border ${toneStyles} p-4 shadow-inner shadow-black/20`}
    >
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-zinc-300">{description}</p>
    </div>
  );
};

export default ProjectOverview;

