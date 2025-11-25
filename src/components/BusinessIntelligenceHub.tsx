"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { showSuccessToast, showErrorToast } from "../lib/toast";
import { useAdminModeActivation } from "../hooks/useAdminModeActivation";
import {
  AlertTriangle,
  ChevronLeft,
  Cpu,
  Flag,
  Loader2,
  RefreshCw,
  Search as SearchIcon,
  ListTodo,
  BookOpen,
  Workflow,
  Keyboard,
  Sparkles,
  Timer,
  Inbox,
  FolderKanban,
  MessageSquare,
  Network,
  Pin,
  List as ListIcon,
  LayoutGrid,
  BarChart,
  SlidersHorizontal,
  Info,
  UserCircle,
  CheckCircle,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  AgentRun,
  CompletedTask,
  TaskPreferences,
  ChatMessage,
  Conversation,
} from "../services/apiClient";
import { useAPI } from "../hooks/useAPI";
import ChatWidget from "./ChatWidget";
import FeedbackLoopTracker from "./FeedbackLoopTracker";
import ProjectOverview from "./ProjectOverview";
import CriticalTasksWidget from "./CriticalTasksWidget";
import ConversationSection from "./workflow/ConversationSection";
import ProjectCard from "./ProjectCard";
import FocusSummaryWidget from "./workflow/FocusSummaryWidget";
import ActiveProjectBanner from "./workflow/ActiveProjectBanner";
import InboxPanel from "./workflow/InboxPanel";
import InboxNoteCard from "./InboxNoteCard";
import ChatHistoryRenderer, {
  type ChatHistoryItem,
} from "./workflow/ChatHistoryRenderer";
import McpToolsRenderer from "./workflow/McpToolsRenderer";
import ShortcutsRenderer from "./workflow/ShortcutsRenderer";
import WorkflowManager from "./workflow/WorkflowManager";
import AnalyticsDashboard from "./analytics/AnalyticsDashboard";
import { FocusHeadline } from "./FocusHeadline";
import { EmptyFocusState } from "./EmptyFocusState";
import { useDashboardData } from "../contexts/DashboardDataContext";
import { useTasksState } from "../hooks/useTasksState";
import { useInboxState } from "../hooks/useInboxState";
import { useSemanticInsights } from "../hooks/useSemanticInsights";
import { useTimelineState } from "../hooks/useTimelineState";
import { useUIState, UtilityView } from "../hooks/useUIState";
import { useAssistantChatRuntime } from "../hooks/useAssistantChatRuntime";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";
const APP_VERSION_LABEL = APP_VERSION.toUpperCase().startsWith("V")
  ? APP_VERSION.toUpperCase()
  : `V${APP_VERSION}`;
const SAVE_CONVERSATION_INTERVAL = 6;
const STREAMING_PLACEHOLDER = "⌛️ Processando...";

type TimelineCard =
  | {
      id: string;
      type: "message";
      author: "user" | "assistant";
      title: string;
      body: string;
      timestamp: string;
      actions?: Array<{ label: string; icon: React.ReactNode }>;
    }
  | {
      id: string;
      type: "insight";
      title: string;
      body: string;
      tags: string[];
      impact: string;
      timestamp: string;
      confidence: number;
    }
  | {
      id: string;
      type: "note";
      title: string;
      snippet: string;
      related: string[];
      timestamp: string;
    }
  | {
      id: string;
      type: "agent";
      title: string;
      status: "running" | "completed" | "scheduled";
      description: string;
      nextRun?: string;
      timestamp: string;
    };

type Task = {
  id: string;
  title: string;
  status: "overdue" | "today" | "upcoming";
  dueDate?: string;
  dueTime?: string;
  project?: string;
  priority?: string | null;
  tags?: string[];
  filePath?: string;
  sourceType?: string;
  headingContext?: string | null;
  lineNumber?: number | null;
  pinned?: boolean;
  originalIndex?: number;
};

type ChatThread = {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
  messageCount: number;
  tags?: string[];
  pinned?: boolean;
};

type AgentCardData = {
  id: string;
  name: string;
  status: string;
  time: string;
  icon: React.ReactNode;
};

type DockButton = {
  id: UtilityView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const formatDateShort = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
  });
};

const formatTimeShort = (value?: string): string => {
  if (!value) return "";
  const date = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimestampLabel = (value?: string) => {
  if (!value) return "agora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTimeRange = (
  start?: string | null,
  end?: string | null
): string => {
  if (end) {
    return `Finalizado às ${formatTimestampLabel(end)}`;
  }
  if (start) {
    return `Iniciado às ${formatTimestampLabel(start)}`;
  }
  return "Execução sem horário registrado";
};

const normalizeAgentStatus = (status?: string) => {
  const value = (status || "").toLowerCase();
  if (value.includes("running")) return "Rodando";
  if (value.includes("success") || value.includes("completed"))
    return "Executado";
  if (value.includes("fail") || value.includes("error")) return "Falha";
  return "Agendado";
};

const buildAgentCard = (run: AgentRun): AgentCardData => {
  const statusLabel = normalizeAgentStatus(run.status);
  let icon: React.ReactNode = <Timer className="h-4 w-4 text-zinc-300" />;
  if (statusLabel === "Executado") {
    icon = <Sparkles className="h-4 w-4 text-emerald-300" />;
  } else if (statusLabel === "Rodando") {
    icon = <Loader2 className="h-4 w-4 text-sky-300 animate-spin" />;
  } else if (statusLabel === "Falha") {
    icon = <AlertTriangle className="h-4 w-4 text-rose-300" />;
  }

  const timeLabel = formatDateTimeRange(run.start_time, run.end_time);

  return {
    id: run.id,
    name: run.agent_name || "Agente",
    status: statusLabel,
    time: timeLabel,
    icon,
  };
};

const BusinessIntelligenceHub: React.FC = () => {
  useAdminModeActivation();

  const api = useAPI();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(
    () => searchParams?.toString() || "",
    [searchParams]
  );

  const {
    snapshot,
    collections,
    loading,
    error,
    refreshing,
    collectionsLoading,
    loadSnapshot: loadDashboardSnapshot,
    getDashboardCollections,
  } = useDashboardData();

  const tasks = useTasksState();
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [criticalTasks, setCriticalTasks] = useState<Task[]>([]);
  const inbox = useInboxState();
  const insights = useSemanticInsights();
  const timeline = useTimelineState();
  const ui = useUIState();

  const loadTasks = useCallback(async () => {
    try {
      const [pending, critical] = await Promise.all([
        api.getPendingTasks(),
        api.getCriticalTasks(),
      ]);
      setPendingTasks(Array.isArray(pending?.data) ? pending.data : []);
      setCriticalTasks(Array.isArray(critical?.data) ? critical.data : []);
    } catch (error) {
      console.error("Failed to load tasks", error);
      toast.error("Não foi possível carregar as tarefas.");
    }
  }, [api]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const tasksList = useMemo(() => {
    const taskMap = new Map<string, Task>();
    criticalTasks.forEach(task => taskMap.set(task.id, task));
    pendingTasks.forEach(task => {
        if (!taskMap.has(task.id)) {
            taskMap.set(task.id, task);
        }
    });
    return Array.from(taskMap.values());
  }, [pendingTasks, criticalTasks]);

  // ... (o resto do arquivo continua aqui, idêntico ao original)

  const filteredTasks = useMemo(() => {
    if (ui.activeUtility !== "tasks") return [];
    const base = tasksList.filter(
      (task) => !tasks.completedTaskIds.has(task.id)
    );
    // ... (resto da lógica de filteredTasks)
  }, [ui.activeUtility, tasksList, tasks.completedTaskIds, tasks.taskSortBy, resolvePriorityWeight]);

  // ... (o resto do arquivo continua aqui, idêntico ao original)

  return (
    // ... (JSX)
  );
};

export default BusinessIntelligenceHub;
  const tasksSetCompletedTaskIds = tasks.setCompletedTaskIds;
  const tasksApplyTaskPreferences = tasks.applyTaskPreferences;
  const tasksSetTaskPreferences = tasks.setTaskPreferences;
  const tasksSetPinnedTaskIds = tasks.setPinnedTaskIds;
  const tasksSetPriorityMap = tasks.setPriorityMap;
  const tasksSetTaskContextDraft = tasks.setTaskContextDraft;
  const tasksSetAiCleanupLoading = tasks.setAiCleanupLoading;
  const tasksSetTaskViewMode = tasks.setTaskViewMode;
  const tasksSetTaskSortBy = tasks.setTaskSortBy;
  const tasksSetSearchTerm = tasks.setSearchTerm;
  const tasksSetBoardOrder = tasks.setBoardOrder;
  const tasksSetBoardDragState = tasks.setBoardDragState;
  const tasksSetSelectedTaskId = tasks.setSelectedTaskId;
  const tasksSetSelectedTaskPath = tasks.setSelectedTaskPath;
  const tasksSetSelectedTaskTitle = tasks.setSelectedTaskTitle;
  const tasksSetSelectedTaskHeading = tasks.setSelectedTaskHeading;
  const tasksSetSelectedTaskContent = tasks.setSelectedTaskContent;
  const tasksSetSelectedTaskLoading = tasks.setSelectedTaskLoading;
  const tasksSetSelectedTaskError = tasks.setSelectedTaskError;
  const tasksSetTogglingTaskId = tasks.setTogglingTaskId;

  const uiSetActiveUtility = ui.setActiveUtility;
  const uiHandleResizeStart = ui.handleResizeStart;
  const uiUpdatePanelRatio = ui.updatePanelRatio;

  const timelineSetActiveConversation = timeline.setActiveConversation;
  const timelineSetChatMessages = timeline.setChatMessages;
  const timelineSetStreamingMessage = timeline.setStreamingMessage;
  const timelineSetThinkingMessage = timeline.setThinkingMessage;
  const timelineSetChatMode = timeline.setChatMode;
  const timelineSetIsTimelineCollapsed = timeline.setIsTimelineCollapsed;
  const timelineSetComposerValue = timeline.setComposerValue;

  const inboxSetInboxNotes = inbox.setInboxNotes;
  const inboxSetInboxLoading = inbox.setInboxLoading;
  const inboxSetInboxError = inbox.setInboxError;
  const inboxSetExpandedInboxPath = inbox.setExpandedInboxPath;
  const inboxSetExpandedInboxFrontmatter = inbox.setExpandedInboxFrontmatter;
  const inboxSetExpandedInboxContent = inbox.setExpandedInboxContent;
  const inboxSetExpandedInboxLoading = inbox.setExpandedInboxLoading;
  const inboxSetExpandedInboxError = inbox.setExpandedInboxError;

  const insightsFetchInsights = insights.fetchInsights;
  const insightsList = insights.insights;

  const activeModelContext = useMemo(() => {
    const type = timeline.activeConversation?.contextType;
    if (type === "global") return "global" as const;
    if (type === "insights") return "insights" as const;
    return "chat" as const;
  }, [timeline.activeConversation?.contextType]);

  const { runtime: assistantRuntime, selection: activeSelection } =
    useAssistantChatRuntime(activeModelContext);

  const providerLabel = activeSelection
    ? `${activeSelection.provider.toUpperCase()} • ${activeSelection.model}`
    : undefined;

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);

  const [dailyNotesLoading, setDailyNotesLoading] = useState(false);
  const [dailyNotesError, setDailyNotesError] = useState<string | null>(null);
  const [dailyNotesList, setDailyNotesList] = useState<any[]>([]);
  const [expandedDailyPath, setExpandedDailyPath] = useState<string | null>(null);
  const [expandedDailyTitle, setExpandedDailyTitle] = useState<string | null>(
    null
  );
  const [expandedDailyFrontmatter, setExpandedDailyFrontmatter] = useState<any>(
    null
  );
  const [expandedDailyContent, setExpandedDailyContent] = useState<string | null>(
    null
  );
  const [expandedDailyLoading, setExpandedDailyLoading] = useState(false);
  const [expandedDailyError, setExpandedDailyError] = useState<string | null>(
    null
  );

  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [conversationListLoading, setConversationListLoading] = useState(false);

  const [availableMcpTools, setAvailableMcpTools] = useState<any[]>([]);

  const [shortcutList, setShortcutList] = useState<any[]>([]);

  const collectionId = useMemo(
    () => searchParams?.get("collection") || null,
    [searchParams]
  );

  const quickAction = useMemo(
    () => searchParams?.get("qa") || null,
    [searchParams]
  );

  const agentCards = useMemo(() => {
    const runs = snapshot?.data?.agent_runs || [];
    return runs.map(buildAgentCard);
  }, [snapshot]);

  const searchResults = useMemo(() => {
    const results = snapshot?.data?.search_results || [];
    return results.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      excerpt: item.excerpt,
    }));
  }, [snapshot]);

  const tasksWithPreferences = useMemo(() => {
    return tasksList.map((task, index) => {
      const overridePriority = tasks.priorityMap?.[task.id];
      return {
        ...task,
        priority: overridePriority ?? task.priority,
        pinned: tasks.pinnedTaskIds.includes(task.id),
        originalIndex: index,
      };
    });
  }, [tasksList, tasks.priorityMap, tasks.pinnedTaskIds]);

  const boardColumns = useMemo(
    () => [
      { id: "overdue", label: "Em atraso" },
      { id: "today", label: "Hoje" },
      { id: "upcoming", label: "Próximas" },
    ],
    []
  );

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    tasksWithPreferences.forEach((task) => map.set(task.id, task));
    return map;
  }, [tasksWithPreferences]);

  useEffect(() => {
    if (!tasks.selectedTaskId) return;
    const stillExists = tasksWithPreferences.some(
      (task) => task.id === tasks.selectedTaskId
    );
    if (!stillExists) {
      tasksSetSelectedTaskId(null);
      tasksSetSelectedTaskPath(null);
      tasksSetSelectedTaskTitle(null);
      tasksSetSelectedTaskHeading(null);
      tasksSetSelectedTaskContent(null);
      tasksSetSelectedTaskError(null);
    }
  }, [
    tasksWithPreferences,
    tasks.selectedTaskId,
    tasksSetSelectedTaskId,
    tasksSetSelectedTaskPath,
    tasksSetSelectedTaskTitle,
    tasksSetSelectedTaskHeading,
    tasksSetSelectedTaskContent,
    tasksSetSelectedTaskError,
  ]);

  useEffect(() => {
    const boardOrder = tasks.boardOrder;
    if (!boardOrder) return;

    const taskMap: Record<string, string[]> = {};
    boardColumns.forEach((col) => (taskMap[col.id] = []));

    tasksWithPreferences.forEach((task) => {
      const column = task.status || "upcoming";
      if (!taskMap[column]) taskMap[column] = [];
      taskMap[column].push(task.id);
    });

    let changed = false;
    const nextOrder: Record<string, string[]> = {};

    boardColumns.forEach((col) => {
      const currentOrder = boardOrder[col.id] || [];
      const validIds = new Set(taskMap[col.id]);
      const newOrder = currentOrder.filter((id) => validIds.has(id));
      const newIds = taskMap[col.id].filter((id) => !currentOrder.includes(id));

      if (newOrder.length + newIds.length !== taskMap[col.id].length) {
        changed = true;
      }

      nextOrder[col.id] = [...newOrder, ...newIds];
    });

    if (changed) {
      tasksSetBoardOrder(nextOrder);
    }
  }, [tasksWithPreferences, tasksSetBoardOrder]);

  const now = useMemo(() => new Date(), []);
  const agendaBuckets = useMemo(() => {
    const result = {
      today: [] as Array<{ title: string; time?: string }>,
      tomorrow: [] as Array<{ title: string; time?: string }>,
      upcoming: [] as Array<{ title: string; time?: string }>,
    };

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    (snapshot?.data?.calendar_events || []).forEach((event) => {
      const start = new Date(event.start);
      const item = {
        title: event.summary,
        time: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      if (start >= todayStart && start <= todayEnd) {
        result.today.push(item);
      } else if (start >= tomorrowStart && start <= tomorrowEnd) {
        result.tomorrow.push(item);
      } else {
        result.upcoming.push(item);
      }
    });

    return result;
  }, [snapshot, now]);

  const chatHistoryItems: ChatHistoryItem[] = useMemo(() => {
    return conversationList.map((conv) => ({
      id: conv.id,
      title: conv.title,
      summary: conv.summary,
      updatedAt: conv.updatedAt,
      messageCount: conv.messageCount,
      tags: conv.tags,
      pinned: conv.pinned,
    }));
  }, [conversationList]);

  const resolvePriorityWeight = useCallback((priority?: string | null) => {
    const p = (priority || "").toLowerCase();
    if (p.startsWith("high")) return 3;
    if (p.startsWith("medium")) return 2;
    if (p.startsWith("low")) return 1;
    return 0;
  }, []);

  const filteredTasks = useMemo(() => {
    if (ui.activeUtility !== "tasks") return [];
    const base = tasksWithPreferences.filter(
      (task) => !tasks.completedTaskIds.has(task.id)
    );
    const computeDueValue = (task: Task) => {
      if (!task.dueDate) return Number.POSITIVE_INFINITY;
      const time = task.dueTime || "23:59";
      const date = new Date(`${task.dueDate}T${time}`);
      return Number.isNaN(date.getTime())
        ? Number.POSITIVE_INFINITY
        : date.getTime();
    };
    const sorted = [...base].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      if (tasks.taskSortBy === "priority") {
        const delta =
          resolvePriorityWeight(a.priority) - resolvePriorityWeight(b.priority);
        if (delta !== 0) return delta;
      } else if (tasks.taskSortBy === "due") {
        const delta = computeDueValue(a) - computeDueValue(b);
        if (delta !== 0) return delta;
      } else if (tasks.taskSortBy === "project") {
        const aProject = a.project || "";
        const bProject = b.project || "";
        if (aProject !== bProject) {
          return aProject.localeCompare(bProject);
        }
      }

      const aIndex = a.originalIndex ?? 0;
      const bIndex = b.originalIndex ?? 0;
      return aIndex - bIndex;
    });
    return sorted;
  }, [
    ui.activeUtility,
    tasksWithPreferences,
    tasks.completedTaskIds,
    tasks.taskSortBy,
    resolvePriorityWeight,
  ]);

  const focusDisplay = useMemo(() => {
    const focusData = snapshot?.data?.focus;
    if (!focusData) return null;

    const dailyNotes = Array.isArray(focusData.daily_notes)
      ? focusData.daily_notes
      : [];
    const firstFreshDaily = dailyNotes.find(
      (note) => note && note.isStale === false
    );
    const weeklyFocus = focusData.weekly_focus || null;
    const staleDaily = dailyNotes.find((note) => note && note.isStale);

    if (firstFreshDaily) {
      return { ...firstFreshDaily, source: "daily" as const };
    }

    if (weeklyFocus && weeklyFocus.isStale === false) {
      return { ...weeklyFocus, source: "weekly" as const };
    }

    if (weeklyFocus) {
      return { ...weeklyFocus, source: "weekly" as const };
    }

    if (staleDaily) {
      return { ...staleDaily, source: "daily" as const };
    }

    return null;
  }, [snapshot]);

  const focusHeadline = focusDisplay?.title ?? null;
  const focusExcerpt = focusDisplay?.excerpt;
  const focusSource = focusDisplay?.source ?? null;
  const focusIsStale = focusDisplay?.isStale ?? false;
  const focusDaysOld =
    typeof focusDisplay?.daysOld === "number" ? focusDisplay.daysOld : null;

  const updatedLabel = useMemo(() => {
    if (!snapshot?.generatedAt)
      return "Atualizado às 07:01 pelo agente Daily Focus";
    return `Atualizado às ${formatTimestampLabel(snapshot.generatedAt)}`;
  }, [snapshot]);

  const activeCollection = useMemo(() => {
    if (!collectionId) return null;
    return collections.find((item) => item.id === collectionId) || null;
  }, [collectionId, collections]);

  useEffect(() => {
    if (!quickAction) return;
    if (quickAction === "new-note") {
      timelineSetComposerValue("/nota ");
    } else if (quickAction === "voice-capture") {
      timelineSetComposerValue("/voz ");
    } else if (quickAction === "media-import") {
      timelineSetComposerValue("/midia ");
    }
  }, [quickAction, timelineSetComposerValue]);

  const handleTaskSelect = useCallback(
    async (task: Task) => {
      if (tasks.selectedTaskId === task.id && !tasks.selectedTaskError) {
        tasks.clearSelectedTask();
        return;
      }

      tasksSetSelectedTaskId(task.id);
      tasksSetSelectedTaskPath(task.filePath || null);
      tasksSetSelectedTaskTitle(task.title);
      tasksSetSelectedTaskHeading(task.headingContext || null);
      tasksSetSelectedTaskContent(null);
      tasksSetSelectedTaskLoading(true);
      tasksSetSelectedTaskError(null);

      if (!task.filePath) {
        tasksSetSelectedTaskError("Caminho do arquivo não encontrado.");
        tasksSetSelectedTaskLoading(false);
        return;
      }

      try {
        const result = await api.getTaskContent(
          task.filePath,
          task.headingContext
        );
        tasksSetSelectedTaskContent(result.content);
      } catch (error) {
        console.error("Failed to load task content", error);
        tasksSetSelectedTaskError("Não foi possível carregar o conteúdo da tarefa.");
      } finally {
        tasksSetSelectedTaskLoading(false);
      }
    },
    [
      api,
      tasks.clearSelectedTask,
      tasks.selectedTaskError,
      tasks.selectedTaskId,
      tasksSetSelectedTaskContent,
      tasksSetSelectedTaskError,
      tasksSetSelectedTaskHeading,
      tasksSetSelectedTaskLoading,
      tasksSetSelectedTaskId,
      tasksSetSelectedTaskPath,
      tasksSetSelectedTaskTitle,
    ]
  );

  const handleToggleTask = useCallback(
    async (taskId: string) => {
      if (tasks.togglingTaskId) return;
      tasksSetTogglingTaskId(taskId);
      try {
        await api.toggleTaskStatus(taskId);
        tasks.toggleTaskCompletion(taskId);
        toast.success("Status da tarefa atualizado.");
      } catch (error) {
        console.error("Failed to toggle task", error);
        toast.error("Não foi possível atualizar o status da tarefa.");
      } finally {
        tasksSetTogglingTaskId(null);
      }
    },
    [
      api,
      tasks.toggleTaskCompletion,
      tasks.togglingTaskId,
      tasksSetTogglingTaskId,
    ]
  );

  const handlePinTask = useCallback(
    async (taskId: string) => {
      const isPinned = tasks.pinnedTaskIds.includes(taskId);
      const previous = [...tasks.pinnedTaskIds];
      tasks.togglePinnedTask(taskId);

      try {
        await persistTaskPreferences({
          pinnedTaskIds: isPinned
            ? previous.filter((id) => id !== taskId)
            : [...previous, taskId],
        });
        toast.success(isPinned ? "Tarefa desafixada." : "Tarefa fixada.");
      } catch (error) {
        console.error("Failed to update pinned tasks", error);
        toast.error("Não foi possível atualizar a tarefa fixada.");
        tasksSetPinnedTaskIds(previous);
      }
    },
    [
      persistTaskPreferences,
      tasks.pinnedTaskIds,
      tasks.togglePinnedTask,
      tasksSetPinnedTaskIds,
    ]
  );

  const handlePriorityChange = useCallback(
    async (taskId: string, priority: string) => {
      const previous = { ...tasks.priorityMap };
      const next = { ...previous, [taskId]: priority };
      tasksSetPriorityMap(next);

      if (!taskPrefsReady) return;

      try {
        await persistTaskPreferences({ priorityMap: next });
      } catch (error) {
        console.error("Failed to update task priority", error);
        toast.error("Não foi possível atualizar a prioridade da tarefa.");
        tasksSetPriorityMap(previous);
      }
    },
    [
      persistTaskPreferences,
      tasks.priorityMap,
      taskPrefsReady,
      tasksSetPriorityMap,
      tasksSetTaskPreferences,
    ]
  );

  const handleViewModeChange = useCallback(
    async (mode: "list" | "kanban") => {
      if (tasks.taskViewMode === mode) return;
      const previous = tasks.taskViewMode;
      tasksSetTaskViewMode(mode);
      if (!taskPrefsReady) return;
      try {
        await persistTaskPreferences({ viewMode: mode });
      } catch (error) {
        console.error("Failed to update view mode", error);
        toast.error("Não foi possível alterar a visualização agora.");
        tasksSetTaskViewMode(previous);
      }
    },
    [
      persistTaskPreferences,
      taskPrefsReady,
      tasks.taskViewMode,
      tasksSetTaskViewMode,
    ]
  );

  const handleSortChange = useCallback(
    async (sort: "natural" | "due" | "priority" | "project") => {
      if (tasks.taskSortBy === sort) {
        setShowSortMenu(false);
        return;
      }
      const previous = tasks.taskSortBy;
      tasksSetTaskSortBy(sort);
      setShowSortMenu(false);
      if (!taskPrefsReady) return;
      try {
        await persistTaskPreferences({ sortBy: sort });
      } catch (error) {
        console.error("Failed to update sort order", error);
        toast.error("Não foi possível atualizar a ordenação agora.");
        tasksSetTaskSortBy(previous);
      }
    },
    [
      persistTaskPreferences,
      taskPrefsReady,
      tasks.taskSortBy,
      tasksSetTaskSortBy,
    ]
  );

  const loadCompletedTasks = useCallback(
    async (force = false) => {
      if (!force && completedTasks.length > 0) return;
      setCompletedLoading(true);
      try {
        const data = await api.getCompletedTasks("week");
        setCompletedTasks(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load completed tasks", error);
        toast.error("Não foi possível carregar tarefas concluídas.");
      } finally {
        setCompletedLoading(false);
      }
    },
    [api, completedTasks]
  );

  const handleOpenCompletedModal = useCallback(async () => {
    setCompletedModalOpen(true);
    await loadCompletedTasks(true);
  }, [loadCompletedTasks]);

  const handleAiCleanup = useCallback(async () => {
    if (tasks.aiCleanupLoading) return;
    tasksSetAiCleanupLoading(true);
    try {
      const result = await api.triggerTaskCleanup({ window: "week" });
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to trigger AI cleanup", error);
      toast.error("Não foi possível acionar a limpeza por IA agora.");
    } finally {
      tasksSetAiCleanupLoading(false);
    }
  }, [tasks.aiCleanupLoading, api, tasksSetAiCleanupLoading]);

  const handleContextSave = useCallback(async () => {
    try {
      await persistTaskPreferences({
        contextTemplate: { ...tasks.taskContextDraft },
        lastContextId: "default",
      });
      toast.success("Contexto salvo para os agentes Cognito.");
      setContextModalOpen(false);
    } catch (error) {
      console.error("Failed to save task context", error);
      toast.error("Não foi possível salvar o contexto agora.");
    }
  }, [persistTaskPreferences, tasks.taskContextDraft]);

  const handleOpenContextModal = useCallback(() => {
    setContextModalOpen(true);
  }, []);

  const handleCloseContextModal = useCallback(() => {
    setContextModalOpen(false);
  }, []);

  const handleCloseCompletedModal = useCallback(() => {
    setCompletedModalOpen(false);
  }, []);

  const handleBoardDragStart = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      taskId: string,
      column: string
    ) => {
      tasksSetBoardDragState({ taskId, fromColumn: column });
      event.dataTransfer.setData("application/task-id", taskId);
      event.dataTransfer.effectAllowed = "move";
    },
    [tasksSetBoardDragState]
  );

  const handleBoardDragEnd = useCallback(() => {
    tasksSetBoardDragState(null);
  }, [tasksSetBoardDragState]);

  const handleBoardDrop = useCallback(
    (taskId: string, targetColumn: string) => {
      if (!taskId) return;
      let nextLayout: Record<string, string[]> | null = null;
      tasksSetBoardOrder((prev) => {
        const columns = new Set([
          "overdue",
          "today",
          "upcoming",
          ...Object.keys(prev || {}),
        ]);
        const next: Record<string, string[]> = {};
        columns.forEach((column) => {
          next[column] = (prev[column] || []).filter((id) => id !== taskId);
        });
        if (!next[targetColumn]) next[targetColumn] = [];
        next[targetColumn] = [...next[targetColumn], taskId];
        const changed = Array.from(columns).some((column) => {
          const current = prev[column] || [];
          const updated = next[column];
          if (current.length !== updated.length) return true;
          return current.some((id, idx) => id !== updated[idx]);
        });
        if (changed) {
          nextLayout = next;
          return next;
        }
        return prev;
      });
      tasksSetBoardDragState(null);
      if (nextLayout && taskPrefsReady) {
        persistTaskPreferences({ boardOrder: nextLayout }).catch((error) => {
          console.error("Failed to persist board layout", error);
          toast.error("Não foi possível salvar a organização do board.");
        });
      }
    },
    [
      persistTaskPreferences,
      taskPrefsReady,
      tasksSetBoardOrder,
      tasksSetBoardDragState,
    ]
  );

  const handleProjectFocus = useCallback(
    (projectId: string) => {
      const params = new URLSearchParams(searchParamsString);
      params.set("collection", projectId);
      router.replace(`/?${params.toString()}`);
    },
    [router, searchParamsString]
  );

  const handleClearProjectFocus = useCallback(() => {
    const params = new URLSearchParams(searchParamsString);
    params.delete("collection");
    const searchValue = params.toString();
    router.replace(`/${searchValue ? `?${searchValue}` : ""}`);
  }, [router, searchParamsString]);

  const handleDefineFocus = useCallback(() => {
    uiSetActiveUtility("dailyNotes");
    timelineSetComposerValue("/foco ");
  }, [timelineSetComposerValue, uiSetActiveUtility]);

  const handleToggleDailyNote = useCallback(
    async (path: string) => {
      const note = dailyNotesList.find((item) => item.path === path);
      if (!note) {
        return;
      }

      const fetchPath = note.vaultPath;
      if (!fetchPath) {
        return;
      }

      if (expandedDailyPath === note.path && !expandedDailyLoading) {
        setExpandedDailyPath(null);
        setExpandedDailyContent(null);
        setExpandedDailyError(null);
        setExpandedDailyTitle(null);
        setExpandedDailyFrontmatter(null);
        return;
      }

      try {
        setExpandedDailyPath(note.path);
        setExpandedDailyLoading(true);
        setExpandedDailyError(null);
        setExpandedDailyContent(null);
        setExpandedDailyTitle(note.title);
        setExpandedDailyFrontmatter(note.frontmatter ?? null);

        const result = await api.getVaultNoteContent(fetchPath);
        setExpandedDailyContent(result.content || "");
        setExpandedDailyTitle(result.title ?? note.title);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Falha ao carregar conteúdo da nota.";
        setExpandedDailyError(message);
      } finally {
        setExpandedDailyLoading(false);
      }
    },
    [
      api,
      dailyNotesList,
      expandedDailyLoading,
      expandedDailyPath,
      setExpandedDailyContent,
      setExpandedDailyError,
      setExpandedDailyFrontmatter,
      setExpandedDailyLoading,
      setExpandedDailyPath,
      setExpandedDailyTitle,
    ]
  );

  const handleOpenInboxNote = useCallback(
    async (path: string) => {
      if (inbox.expandedInboxPath === path && !inbox.expandedInboxLoading) {
        inboxSetExpandedInboxPath(null);
        inboxSetExpandedInboxContent(null);
        inboxSetExpandedInboxError(null);
        inboxSetExpandedInboxFrontmatter(null);
        return;
      }
      try {
        inboxSetExpandedInboxPath(path);
        inboxSetExpandedInboxLoading(true);
        inboxSetExpandedInboxError(null);
        inboxSetExpandedInboxContent(null);
        inboxSetExpandedInboxFrontmatter(null);
        const result = await api.getInboxNoteContent(path);
        inboxSetExpandedInboxContent(result?.content || "");
        inboxSetExpandedInboxFrontmatter(result?.frontmatter || null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Falha ao carregar conteúdo da nota.";
        inboxSetExpandedInboxError(message);
      } finally {
        inboxSetExpandedInboxLoading(false);
      }
    },
    [
      api,
      inbox.expandedInboxLoading,
      inbox.expandedInboxPath,
      inboxSetExpandedInboxPath,
      inboxSetExpandedInboxContent,
      inboxSetExpandedInboxError,
      inboxSetExpandedInboxFrontmatter,
      inboxSetExpandedInboxLoading,
    ]
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col gap-4 overflow-hidden text-zinc-100">
      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-950/80 px-6 py-4 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            {focusHeadline && focusSource ? (
              <>
                <div className="mt-2">
                  <FocusHeadline
                    text={focusHeadline}
                    excerpt={focusExcerpt}
                    source={focusSource}
                    isStale={focusIsStale}
                    daysOld={focusDaysOld ?? undefined}
                  />
                </div>
                <p className="text-xs text-zinc-500">{updatedLabel}</p>
              </>
            ) : (
              <EmptyFocusState onDefineFocus={handleDefineFocus} />
            )}
          </div>
          <FocusSummaryWidget metrics={focusSummary} />
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-neutral-800/60 bg-neutral-950/80 p-4 shadow-2xl shadow-black/30">
            <ConversationSection
              chatMode={timeline.chatMode}
              setChatMode={timelineSetChatMode}
              composerValue={timeline.composerValue}
              setComposerValue={timelineSetComposerValue}
              handleSendMessage={handleSendMessage}
              thinking={timeline.thinkingMessage !== null}
              providerLabel={providerLabel}
            />
          </div>
          <aside
            className="flex flex-col gap-2 rounded-2xl border border-neutral-800/60 bg-neutral-950/80 p-4 shadow-2xl shadow-black/30"
            style={{ height: ui.panelRatio }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {dockButtons.map((button) => (
                  <button
                    key={button.id}
                    onClick={() => uiSetActiveUtility(button.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      ui.activeUtility === button.id
                        ? "bg-neutral-700/50 text-zinc-100"
                        : "text-zinc-400 hover:bg-neutral-800 hover:text-zinc-100"
                    }`}
                    aria-label={button.label}
                  >
                    <button.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              {ui.activeUtility === "tasks" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-zinc-300 transition hover:border-neutral-600"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Ordenar
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-4 bottom-12 z-10 w-48 rounded-lg border border-neutral-700 bg-neutral-800 shadow-lg">
                      <button
                        onClick={() => handleSortChange("natural")}
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-neutral-700"
                      >
                        Natural
                      </button>
                      <button
                        onClick={() => handleSortChange("due")}
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-neutral-700"
                      >
                        Data de Vencimento
                      </button>
                      <button
                        onClick={() => handleSortChange("priority")}
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-neutral-700"
                      >
                        Prioridade
                      </button>
                      <button
                        onClick={() => handleSortChange("project")}
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-neutral-700"
                      >
                        Projeto
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleViewModeChange("list")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      tasks.taskViewMode === "list"
                        ? "bg-neutral-700/50 text-zinc-100"
                        : "text-zinc-400 hover:bg-neutral-800 hover:text-zinc-100"
                    }`}
                  >
                    <ListIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleViewModeChange("kanban")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      tasks.taskViewMode === "kanban"
                        ? "bg-neutral-700/50 text-zinc-100"
                        : "text-zinc-400 hover:bg-neutral-800 hover:text-zinc-100"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* INSIGHTS FIXADOS / CRITICAL TASKS WIDGET HERE */}
              <CriticalTasksWidget />
              {renderUtilityContent()}
            </div>
          </aside>
        </div>

        <aside className="flex w-16 flex-col items-center gap-2 rounded-2xl border border-neutral-800/60 bg-neutral-950/80 py-3 shadow-2xl shadow-black/30">
          <button
            onClick={() => {}}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg"
          >
            <Sparkles className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => {}}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-zinc-300"
          >
            <UserCircle className="h-5 w-5" />
          </button>
        </aside>
      </div>
    </div>
  );
};

export default BusinessIntelligenceHub;
