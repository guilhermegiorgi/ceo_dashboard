import brainCloudClient, { getBrainCloudRuntimeConfig } from './brainCloudClient.js';
import { listRuns, getAllAgents } from './agentService.js';

function sanitizeError(error) {
  if (!error) {
    return 'Erro desconhecido';
  }
  if (typeof error === 'string') {
    return error;
  }
  return error.message || 'Erro inesperado';
}

function normalizeRecentActivities(activities = []) {
  return activities.map((activity, index) => ({
    id: activity?.path || activity?.id || `activity-${index}`,
    title: activity?.title || activity?.basename || activity?.name || 'Atualização recente',
    summary: activity?.summary || activity?.details || activity?.change || null,
    path: activity?.path || null,
    type: activity?.type || activity?.activity_type || 'note',
    modified: activity?.modified || activity?.mtime || null,
    tags: activity?.tags || [],
  }));
}

function simplifyDueItems(dueItems = []) {
  return dueItems.slice(0, 12).map((item) => {
    const firstSegment = item.file_path ? item.file_path.split('/')[0] : null;
    let status = 'upcoming';
    if (item.is_overdue) status = 'overdue';
    else if (item.days_until_due !== undefined && item.days_until_due <= 0) status = 'today';
    return {
      id: `${item.file_path || 'task'}:${item.line_number ?? '0'}`,
      title: item.title,
      status,
      dueDate: item.due_date,
      dueTime: item.due_time,
      priority: item.priority,
      project: firstSegment,
      tags: item.tags || [],
      sourceType: item.type,
      filePath: item.file_path,
      headingContext: item.heading_context,
      lineNumber: typeof item.line_number === 'number' ? item.line_number : null,
    };
  });
}

function summarizeAgents(runs = []) {
  const stats = {
    running: 0,
    success: 0,
    failed: 0,
    total: runs.length,
  };

  runs.forEach((run) => {
    if (!run?.status) return;
    const key = run.status.toLowerCase();
    if (key.includes('running')) stats.running += 1;
    else if (key.includes('success')) stats.success += 1;
    else if (key.includes('fail') || key.includes('error')) stats.failed += 1;
  });

  return stats;
}

export async function getDashboardSnapshot({ tasksWindow = 'week', context } = {}) {
  const generatedAt = new Date().toISOString();
  const warnings = [];
  const data = {
    focus: null,
    timeContext: null,
    tasks: {
      due: null,
      summary: null,
      overdue: null,
      simplified: [],
      metrics: {
        overdue: 0,
        dueToday: 0,
        upcoming: 0,
      },
    },
    agents: {
      recentRuns: [],
      stats: {
        running: 0,
        success: 0,
        failed: 0,
        total: 0,
      },
    },
  };

  const config = await getBrainCloudRuntimeConfig().catch((error) => {
    warnings.push({ scope: 'config', message: sanitizeError(error) });
    return null;
  });

  if (!config) {
    return {
      success: false,
      generatedAt,
      warnings,
      data,
    };
  }

  if (!config.enableRest) {
    warnings.push({
      scope: 'braincloud',
      message: 'Integração REST com a Brain Cloud desativada nas configurações.',
    });
  } else {
    const [focusResult, timeResult, dueResult, summaryResult, overdueResult] = await Promise.allSettled([
      brainCloudClient.getCurrentFocus({ daily_limit: 4, include_weekly: true }).catch((error) => {
        throw new Error(`Focus: ${sanitizeError(error)}`);
      }),
      brainCloudClient.getTimeBasedContext({ upcoming_window: tasksWindow }).catch((error) => {
        throw new Error(`Contexto temporal: ${sanitizeError(error)}`);
      }),
      brainCloudClient.getDueTasks({ window: tasksWindow, limit: 100 }).catch((error) => {
        throw new Error(`Tarefas: ${sanitizeError(error)}`);
      }),
      brainCloudClient.getTasksSummary({ range: 'this_week', group_by: 'priority' }).catch((error) => {
        throw new Error(`Resumo de tarefas: ${sanitizeError(error)}`);
      }),
      brainCloudClient.getOverdueTasks({ severity: 'all' }).catch((error) => {
        throw new Error(`Atrasos: ${sanitizeError(error)}`);
      }),
    ]);

    if (focusResult.status === 'fulfilled') {
      data.focus = focusResult.value;
    } else {
      warnings.push({ scope: 'focus', message: sanitizeError(focusResult.reason) });
    }

    if (timeResult.status === 'fulfilled') {
      const rawContext = timeResult.value;
      data.timeContext = {
        ...rawContext,
        recent_activities: normalizeRecentActivities(rawContext?.recent_activities),
      };
    } else {
      warnings.push({ scope: 'timeContext', message: sanitizeError(timeResult.reason) });
    }

    if (dueResult.status === 'fulfilled') {
      data.tasks.due = dueResult.value;
      data.tasks.simplified = simplifyDueItems(dueResult.value?.items || []);
      data.tasks.metrics = {
        overdue: dueResult.value?.overdue_count ?? 0,
        dueToday: dueResult.value?.due_today_count ?? 0,
        upcoming: dueResult.value?.upcoming_count ?? 0,
      };
    } else {
      warnings.push({ scope: 'tasks', message: sanitizeError(dueResult.reason) });
    }

    if (summaryResult.status === 'fulfilled') {
      data.tasks.summary = summaryResult.value;
    } else {
      warnings.push({ scope: 'tasksSummary', message: sanitizeError(summaryResult.reason) });
    }

    if (overdueResult.status === 'fulfilled') {
      data.tasks.overdue = overdueResult.value;
    } else {
      warnings.push({ scope: 'tasksOverdue', message: sanitizeError(overdueResult.reason) });
    }
  }

  try {
    const [runs, agents] = await Promise.all([
      listRuns(15, context),
      getAllAgents(context).catch(() => []),
    ]);
    const agentLookup = new Map((agents || []).map((agent) => [agent.id, agent]));
    data.agents.recentRuns = runs.map((run) => ({
      ...run,
      agent_name: agentLookup.get(run.agent_id)?.name || 'Agente sem nome',
    }));
    data.agents.stats = summarizeAgents(runs);
  } catch (error) {
    warnings.push({ scope: 'agents', message: sanitizeError(error) });
  }

  return {
    success: warnings.length === 0,
    generatedAt,
    data,
    warnings,
    config: {
      restEnabled: Boolean(config.enableRest),
      mcpEnabled: Boolean(config.enableMcp),
      baseUrl: config.baseUrl,
      tenantId: config.tenantId || null,
    },
  };
}

export default {
  getDashboardSnapshot,
};
