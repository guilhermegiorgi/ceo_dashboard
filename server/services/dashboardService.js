import brainCloudClient, { getBrainCloudRuntimeConfig } from './brainCloudClient.js';
import brainCloudService from './brainCloudService.js';
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
  console.log(`[simplifyDueItems] Processing ${dueItems.length} tasks`);
  
  return dueItems.slice(0, 50).map((item, index) => {
    const firstSegment = item.file_path ? item.file_path.split('/')[0] : null;
    let status = 'upcoming';
    if (item.is_overdue) status = 'overdue';
    else if (item.days_until_due !== undefined && item.days_until_due <= 0) status = 'today';
    const baseId = item?.file_path || item?.path || item?.id || `task-${index}`;
    const title =
      item?.title ||
      item?.name ||
      item?.content ||
      item?.summary ||
      `Tarefa ${index + 1}`;

    // Extract line number properly
    const lineNum = typeof item.line_number === 'number'
      ? item.line_number
      : typeof item.lineNumber === 'number'
        ? item.lineNumber
        : null;

    // Log for debugging toggle issues
    if (index === 0) {
      console.log('[simplifyDueItems] First item example:', {
        type: item.type,
        hasLineNumber: lineNum !== null,
        lineNumber: lineNum,
        file_path: item.file_path,
        title: title.substring(0, 50)
      });
    }

    return {
      id: `${baseId}:${lineNum ?? '0'}`,
      title: String(title),
      status,
      dueDate: item.due_date,
      dueTime: item.due_time,
      priority: item.priority,
      project: firstSegment,
      tags: item.tags || [],
      sourceType: item.type, // 'note' or 'task'
      filePath: item.file_path || item.path || null,
      headingContext: item.heading_context || item.headingContext || null,
      lineNumber: lineNum,
      isProjectNote: item.type === 'note', // Flag to indicate it's a project note, not a checkbox task
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

function extractSnippet(value, limit = 240) {
  if (!value) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function normalizeFocusSnapshot(raw) {
  if (!raw) {
    console.log('[normalizeFocusSnapshot] No focus data received');
    return null;
  }

  const tryParseJson = (value) => {
    if (typeof value !== 'string') return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('[normalizeFocusSnapshot] Failed to parse JSON string:', error.message);
      return null;
    }
  };

  let payload = raw;
  let metadata = undefined;

  if (typeof payload === 'string') {
    const parsed = tryParseJson(payload);
    if (parsed) {
      payload = parsed;
    }
  }

  if (payload && typeof payload === 'object' && Array.isArray(payload.content)) {
    const firstEntry = payload.content.find((entry) => entry && typeof entry === 'object');
    if (firstEntry) {
      if (firstEntry.type === 'json' && firstEntry.data) {
        payload = firstEntry.data;
      } else if (firstEntry.type === 'text' && typeof firstEntry.text === 'string') {
        const parsed = tryParseJson(firstEntry.text);
        if (parsed) {
          payload = parsed;
        }
      }
    }
  }

  const unwrapFocus = (value) => {
    if (value && typeof value === 'object') {
      metadata = metadata ?? value.metadata ?? value.meta;
      return value;
    }
    return null;
  };

  if (
    payload &&
    typeof payload === 'object' &&
    payload.success &&
    payload.focus &&
    typeof payload.focus === 'object'
  ) {
    payload = unwrapFocus(payload.focus) ?? payload.focus;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    payload.data &&
    typeof payload.data === 'object' &&
    payload.data.focus
  ) {
    payload = unwrapFocus(payload.data.focus) ?? payload.data.focus;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    payload.focus &&
    typeof payload.focus === 'object' &&
    (Array.isArray(payload.focus.daily_notes) ||
      Array.isArray(payload.focus.dailyNotes))
  ) {
    payload = unwrapFocus(payload.focus) ?? payload.focus;
  }

  if (!payload || typeof payload !== 'object') {
    console.log('[normalizeFocusSnapshot] Focus payload is not an object');
    return null;
  }

  metadata = metadata ?? payload.metadata ?? payload.meta;

  const now = new Date();
  const msInDay = 1000 * 60 * 60 * 24;
  const extractDateFromString = (value) => {
    if (typeof value !== 'string') return null;
    const match = value.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  };
  const toIsoDate = (value) => {
    if (!value) return undefined;
    const rawValue = value.trim();
    if (!rawValue) return undefined;
    const direct = new Date(rawValue);
    if (!Number.isNaN(direct.getTime())) {
      return direct.toISOString();
    }
    const dateOnly = extractDateFromString(rawValue);
    if (dateOnly) {
      const composed = new Date(`${dateOnly}T00:00:00`);
      if (!Number.isNaN(composed.getTime())) {
        return composed.toISOString();
      }
    }
    return undefined;
  };

  const dailySource = Array.isArray(payload.daily_notes)
    ? payload.daily_notes
    : Array.isArray(payload.dailyNotes)
      ? payload.dailyNotes
      : Array.isArray(payload.daily)
        ? payload.daily
        : [];

  const dailyNotes = dailySource
    .map((note, index) => {
      const pathCandidate =
        note?.path || note?.file_path || note?.id || note?.basename || null;
      const path =
        typeof pathCandidate === 'string' && pathCandidate.trim().length > 0
          ? pathCandidate
          : `note-${index}`;

      if (path.toLowerCase().includes('readme.md')) {
        return null;
      }

      const size =
        typeof note?.size === 'number'
          ? note.size
          : typeof note?.file_size === 'number'
            ? note.file_size
            : typeof note?.bytes === 'number'
              ? note.bytes
              : undefined;
      if (typeof size === 'number' && size < 80) {
        return null;
      }

      const frontmatter =
        (note && typeof note.frontmatter === 'object' && note.frontmatter) ||
        (note && typeof note.metadata === 'object' && note.metadata) ||
        undefined;
      const frontmatterDate =
        frontmatter && typeof frontmatter.date === 'string'
          ? frontmatter.date
          : undefined;
      const fileNameDate = extractDateFromString(path);
      const titleDate = extractDateFromString(
        typeof note?.title === 'string' ? note.title : undefined
      );
      const explicitDate =
        (typeof note?.date === 'string' && note.date) ||
        (typeof note?.created_at === 'string' && note.created_at) ||
        (typeof note?.createdAt === 'string' && note.createdAt) ||
        (typeof note?.timestamp === 'string' && note.timestamp) ||
        undefined;

      const titleCandidate =
        note?.title ||
        note?.name ||
        note?.basename ||
        (typeof path === 'string' ? path.split('/').pop() : null) ||
        `Nota ${index + 1}`;

      const modifiedRaw =
        note?.modified ||
        note?.mtime ||
        note?.updated_at ||
        frontmatterDate ||
        explicitDate ||
        titleDate ||
        fileNameDate ||
        null;
      const modified = toIsoDate(modifiedRaw);
      const daysOld =
        modified && !Number.isNaN(new Date(modified).getTime())
          ? Math.floor((now.getTime() - new Date(modified).getTime()) / msInDay)
          : null;

      const excerptSource =
        note?.excerpt ||
        note?.summary ||
        note?.content ||
        note?.text ||
        '';

      return {
        path: String(path),
        title: String(titleCandidate),
        excerpt:
          note?.excerpt ||
          note?.summary ||
          extractSnippet(excerptSource),
        tags: Array.isArray(note?.tags) ? note.tags.map(String) : undefined,
        modified,
        size,
        frontmatter,
        isStale: typeof daysOld === 'number' ? daysOld > 3 : false,
        daysOld,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a?.modified ? new Date(a.modified).getTime() : 0;
      const bTime = b?.modified ? new Date(b.modified).getTime() : 0;
      return bTime - aTime;
    });

  const weeklyRaw =
    payload.weekly_focus || payload.weeklyFocus || payload.weekly || null;
  let weeklyFocus = null;
  if (weeklyRaw) {
    if (typeof weeklyRaw === 'string') {
      weeklyFocus = {
        path: undefined,
        title: 'Weekly Focus',
        excerpt: extractSnippet(weeklyRaw),
        tags: undefined,
        modified: undefined,
        frontmatter: undefined,
        size: undefined,
        isStale: false,
        daysOld: null,
      };
    } else {
      const weeklyTitleDate = extractDateFromString(
        typeof weeklyRaw.title === 'string' ? weeklyRaw.title : undefined
      );
      const weeklyPathDate = extractDateFromString(
        typeof weeklyRaw.path === 'string' ? weeklyRaw.path : undefined
      );
      const weeklyModifiedRaw =
        weeklyRaw.modified ||
        weeklyRaw.mtime ||
        weeklyRaw.updated_at ||
        weeklyRaw.frontmatter?.date ||
        weeklyTitleDate ||
        weeklyPathDate ||
        null;
      const weeklyModified = toIsoDate(weeklyModifiedRaw);
      const weeklyDaysOld =
        weeklyModified && !Number.isNaN(new Date(weeklyModified).getTime())
          ? Math.floor(
              (now.getTime() - new Date(weeklyModified).getTime()) / msInDay
            )
          : null;

      weeklyFocus = {
        path: weeklyRaw.path || weeklyRaw.file_path || undefined,
        title:
          weeklyRaw.title ||
          weeklyRaw.name ||
          weeklyRaw.basename ||
          'Weekly Focus',
        excerpt:
          weeklyRaw.excerpt ||
          weeklyRaw.summary ||
          extractSnippet(weeklyRaw.content || weeklyRaw.text || ''),
        tags: Array.isArray(weeklyRaw.tags)
          ? weeklyRaw.tags.map(String)
          : undefined,
        modified: weeklyModified,
        frontmatter:
          (weeklyRaw && typeof weeklyRaw.frontmatter === 'object'
            ? weeklyRaw.frontmatter
            : undefined) ||
          undefined,
        size:
          typeof weeklyRaw.size === 'number'
            ? weeklyRaw.size
            : typeof weeklyRaw.file_size === 'number'
              ? weeklyRaw.file_size
              : undefined,
        isStale: typeof weeklyDaysOld === 'number' ? weeklyDaysOld > 14 : false,
        daysOld: weeklyDaysOld,
      };
    }
  }

  return {
    daily_notes: dailyNotes,
    weekly_focus: weeklyFocus,
    metadata,
    timestamp:
      payload.timestamp ||
      payload.generated_at ||
      payload.generatedAt ||
      (metadata && (metadata.generated_at || metadata.generatedAt)) ||
      (raw &&
        typeof raw === 'object' &&
        (raw.timestamp || raw.generated_at || raw.generatedAt)) ||
      new Date().toISOString(),
  };
}

function normalizeDueTasksResponse(raw) {
  const emptyMetrics = { overdue: 0, dueToday: 0, upcoming: 0 };
  if (!raw) {
    console.log('[normalizeDueTasksResponse] Raw is null/undefined');
    return { raw: null, items: [], summary: null, metrics: emptyMetrics };
  }

  console.log('[normalizeDueTasksResponse] Raw structure:', {
    hasItems: Array.isArray(raw.items),
    hasTasks: Array.isArray(raw.tasks),
    hasResults: Array.isArray(raw.results),
    hasContent: Array.isArray(raw.content),
    keys: Object.keys(raw),
    itemsLength: raw.items?.length,
    tasksLength: raw.tasks?.length,
    contentLength: raw.content?.length
  });

  // Brain Cloud MCP retorna { content: [{ type, data }] }
  let items = [];
  if (Array.isArray(raw.items)) {
    items = raw.items;
  } else if (Array.isArray(raw.tasks)) {
    items = raw.tasks;
  } else if (Array.isArray(raw.results)) {
    items = raw.results;
  } else if (Array.isArray(raw.content)) {
    // MCP format: content array com objetos { type, data/text }
    console.log('[normalizeDueTasksResponse] Content[0]:', JSON.stringify(raw.content[0], null, 2).substring(0, 800));
    
    const firstContent = raw.content[0];
    
    if (firstContent?.type === 'json' && firstContent?.data) {
      // JSON direto
      const data = firstContent.data;
      items = data.items || data.tasks || data.results || [];
      console.log(`[normalizeDueTasksResponse] Extracted from content[0].data: ${items.length} items`);
    } else if (firstContent?.type === 'text' && firstContent?.text) {
      // JSON como string, precisa parsear
      try {
        const parsed = JSON.parse(firstContent.text);
        items = parsed.items || parsed.tasks || parsed.results || [];
        console.log(`[normalizeDueTasksResponse] Parsed text and extracted: ${items.length} items`);
        
        // Se items está vazio mas success=true, logar warning
        if (items.length === 0 && parsed.success) {
          console.log('[normalizeDueTasksResponse] WARNING: MCP returned success but 0 items. Query params:', parsed.query_params);
        }
      } catch (e) {
        console.error('[normalizeDueTasksResponse] Failed to parse text content:', e.message);
        items = raw.content;
      }
    } else {
      items = raw.content;
    }
  }

  console.log(`[normalizeDueTasksResponse] Final extracted: ${items.length} items`);

  const summary = raw.summary || raw.stats || raw.metrics || null;
  const metrics = {
    overdue: Number(summary?.overdue ?? summary?.overdue_count ?? raw.overdue_count ?? 0) || 0,
    dueToday: Number(summary?.today ?? summary?.due_today ?? raw.due_today_count ?? 0) || 0,
    upcoming: Number(summary?.upcoming ?? summary?.future ?? raw.upcoming_count ?? 0) || 0,
  };

  return { raw, items, summary, metrics };
}

function normalizeSearchResults(result) {
  if (!result) return [];

  const payload = Array.isArray(result.results)
    ? result.results
    : Array.isArray(result.content)
      ? result.content.map((entry) => {
          if (entry?.type === 'json' && entry.data) return entry.data;
          if (entry?.type === 'text') {
            try {
              const parsed = JSON.parse(entry.text);
              if (parsed && typeof parsed === 'object') return parsed;
            } catch (error) {
              return { text: entry.text };
            }
          }
          return entry;
        })
      : [];

  return payload
    .filter(Boolean)
    .map((item, index) => {
      const path = item.path || item.file_path || item.id || `result-${index}`;
      const titleCandidate =
        item.title ||
        item.name ||
        item.basename ||
        (typeof path === 'string' ? path.split('/').pop() : null) ||
        `Nota ${index + 1}`;

      return {
        path: String(path),
        title: String(titleCandidate),
        excerpt:
          item.excerpt ||
          item.summary ||
          extractSnippet(item.text || item.snippet || item.content || ''),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : undefined,
        modified: item.modified || item.timestamp || item.mtime || undefined,
      };
    });
}

async function fetchFocusSnapshot() {
  let lastError = null;
  try {
    const result = await brainCloudService.getCurrentFocus();
    const normalized = normalizeFocusSnapshot(result);
    if (normalized) return normalized;
  } catch (error) {
    lastError = error;
  }

  try {
    const fallback = await brainCloudClient.getCurrentFocus({
      daily_limit: 4,
      include_weekly: true,
    });
    return normalizeFocusSnapshot(fallback);
  } catch (error) {
    const finalError = lastError || error;
    throw finalError;
  }
}

async function fetchDueTasks(window) {
  let lastError = null;
  console.log(`[fetchDueTasks] Fetching tasks with window: ${window || 'all'}`);
  
  try {
    const result = await brainCloudService.getDueTasks(window || 'all', false);
    console.log('[fetchDueTasks] Got result from brainCloudService:', result ? 'OK' : 'EMPTY');
    return normalizeDueTasksResponse(result);
  } catch (error) {
    console.log('[fetchDueTasks] brainCloudService failed, trying fallback:', error.message);
    lastError = error;
  }

  try {
    const fallback = await brainCloudClient.getDueTasks({
      window,
      limit: 100,
    });
    console.log('[fetchDueTasks] Fallback result:', fallback ? 'OK' : 'EMPTY');
    return normalizeDueTasksResponse(fallback);
  } catch (error) {
    console.error('[fetchDueTasks] Both methods failed');
    const finalError = lastError || error;
    throw finalError;
  }
}

async function fetchRecentNotes() {
  try {
    const result = await brainCloudService.semanticSearch('modified:today', 5);
    const notes = normalizeSearchResults(result);
    if (notes.length) return notes;
  } catch (error) {
    // fallback below
  }

  try {
    const fallback = await brainCloudClient.semanticSearch({
      query: 'modified:today',
      limit: 5,
    });
    return normalizeSearchResults(fallback);
  } catch (error) {
    return [];
  }
}

export async function getDashboardSnapshot({ tasksWindow = 'all', context } = {}) {
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
    recentNotes: [],
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
    const [
      focusResult,
      timeResult,
      dueResult,
      summaryResult,
      overdueResult,
      recentNotesResult,
    ] = await Promise.allSettled([
      fetchFocusSnapshot(),
      brainCloudClient
        .getTimeBasedContext({ upcoming_window: tasksWindow })
        .catch((error) => {
          throw new Error(`Contexto temporal: ${sanitizeError(error)}`);
        }),
      fetchDueTasks(tasksWindow),
      brainCloudClient
        .getTasksSummary({ range: 'this_week', group_by: 'priority' })
        .catch((error) => {
          throw new Error(`Resumo de tarefas: ${sanitizeError(error)}`);
        }),
      brainCloudClient
        .getOverdueTasks({ severity: 'all' })
        .catch((error) => {
          throw new Error(`Atrasos: ${sanitizeError(error)}`);
        }),
      fetchRecentNotes(),
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
      const normalized = dueResult.value;
      data.tasks.due = normalized.raw;
      data.tasks.simplified = simplifyDueItems(normalized.items || []);
      data.tasks.metrics = normalized.metrics;
      if (!data.tasks.summary && normalized.summary) {
        data.tasks.summary = normalized.summary;
      }
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

    if (recentNotesResult.status === 'fulfilled') {
      data.recentNotes = recentNotesResult.value || [];
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
