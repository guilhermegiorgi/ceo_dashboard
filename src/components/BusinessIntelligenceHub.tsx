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
  // Initialize admin mode listener
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
  const inbox = useInboxState();
  const insights = useSemanticInsights();
  const timeline = useTimelineState();
  const ui = useUIState();

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
  const timelineToolEvents = timeline.toolEvents;
  const timelineSetToolEvents = timeline.setToolEvents;

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

  const activeConversationId = timeline.activeConversation?.id;

  const threadMessages = useMemo(() => {
    const base = timeline.chatMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.content }],
      createdAt: new Date(message.createdAt),
      status:
        message.role === "assistant"
          ? ({
              type: "complete",
              reason: "stop",
            } as const)
          : undefined,
    }));

    if (timeline.thinkingMessage) {
      base.push({
        id: "thinking",
        role: "assistant" as const,
        content: [
          {
            type: "reasoning",
            text: timeline.thinkingMessage,
          },
        ],
        status: { type: "running" as const },
        createdAt: new Date(),
      });
    }

    if (timeline.streamingMessage) {
      const isPlaceholder =
        timeline.streamingMessage === STREAMING_PLACEHOLDER;

      base.push({
        id: "streaming",
        role: "assistant" as const,
        content: [
          {
            type: "text",
            text: isPlaceholder ? "" : timeline.streamingMessage,
          },
        ],
        status: { type: "running" as const },
        metadata: {
          custom: {
            isPlaceholder,
          },
        },
        createdAt: new Date(),
      });
    }

    return base;
  }, [
    timeline.chatMessages,
    timeline.streamingMessage,
    timeline.thinkingMessage,
  ]);

  const serializedThreadMessages = useMemo(
    () =>
      JSON.stringify(
        threadMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content.map((part) => part.text),
        }))
      ),
    [threadMessages]
  );

  const lastSerializedThreadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assistantRuntime) return;

    let retryHandle: ReturnType<typeof setTimeout> | null = null;

    const syncRuntimeThread = () => {
      if (assistantRuntime.thread.state === null) {
        if (retryHandle === null) {
          retryHandle = window.setTimeout(() => {
            retryHandle = null;
            syncRuntimeThread();
          }, 50);
        }
        return;
      }

      if (serializedThreadMessages === lastSerializedThreadRef.current) return;

      try {
        assistantRuntime.thread.reset(threadMessages);
        lastSerializedThreadRef.current = serializedThreadMessages;
      } catch (error) {
        if (error instanceof Error && error.message.includes("empty thread")) {
          if (retryHandle === null) {
            retryHandle = window.setTimeout(() => {
              retryHandle = null;
              syncRuntimeThread();
            }, 50);
          }
          return;
        }
        console.error("Failed to sync assistant runtime thread", error);
      }
    };

    syncRuntimeThread();
    const unsubscribe = assistantRuntime.thread.subscribe(syncRuntimeThread);

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
      if (retryHandle !== null) {
        clearTimeout(retryHandle);
      }
    };
  }, [
    assistantRuntime,
    serializedThreadMessages,
    threadMessages,
    activeConversationId,
  ]);

  useEffect(() => {
    tasksSetCompletedTaskIds(new Set());
  }, [snapshot, tasksSetCompletedTaskIds]);

  // Chat/Conversation states not gerenciados pelos hooks
  const [chatLoading, setChatLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [taskPrefsReady, setTaskPrefsReady] = useState(false);
  const [openPriorityMenuId, setOpenPriorityMenuId] = useState<string | null>(
    null
  );
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [expandedDailyPath, setExpandedDailyPath] = useState<string | null>(
    null
  );
  const [expandedDailyContent, setExpandedDailyContent] = useState<
    string | null
  >(null);
  const [expandedDailyTitle, setExpandedDailyTitle] = useState<string | null>(
    null
  );
  const [expandedDailyLoading, setExpandedDailyLoading] = useState(false);
  const [expandedDailyError, setExpandedDailyError] = useState<string | null>(
    null
  );
  const [expandedDailyFrontmatter, setExpandedDailyFrontmatter] = useState<
    Record<string, unknown> | string | null
  >(null);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [conversationListLoading, setConversationListLoading] =
    useState(false);

  const conversationContextFilter = useMemo<
    "global" | "project" | "note" | undefined
  >(() => {
    const contextType = timeline.activeConversation?.contextType;
    if (contextType === "project" || contextType === "note") {
      return contextType;
    }
    if (activeModelContext === "insights") {
      return "note";
    }
    if (activeModelContext === "global") {
      return "global";
    }
    return undefined;
  }, [timeline.activeConversation?.contextType, activeModelContext]);

  const refreshConversationList = useCallback(async () => {
    try {
      setConversationListLoading(true);
      const { conversations } = await api.getConversations({
        limit: 30,
        contextType: conversationContextFilter,
      });
      setConversationList(conversations);
    } catch (error) {
      console.error("Failed to load conversation list:", error);
    } finally {
      setConversationListLoading(false);
    }
  }, [api, conversationContextFilter]);

  useEffect(() => {
    refreshConversationList();
  }, [refreshConversationList]);

  const tasksList = useMemo<Task[]>(() => {
    const simplified = snapshot?.data?.tasks?.simplified;
    if (simplified && simplified.length > 0) {
      return simplified.map((item) => ({
        id: item.id,
        title: item.title,
        status: (item.status as Task["status"]) || "upcoming",
        dueDate: item.dueDate,
        dueTime: item.dueTime,
        project: item.project,
        priority: item.priority as Task["priority"],
        tags: item.tags,
        filePath: item.filePath,
        sourceType: item.sourceType,
        headingContext: item.headingContext,
        lineNumber: item.lineNumber,
      }));
    }
    return [];
  }, [snapshot]);

  // Buscar insights quando o contexto mudar
  useEffect(() => {
    if (snapshot && tasksList.length > 0) {
      const timer = setTimeout(() => {
        insightsFetchInsights();
      }, 1000); // Delay para evitar muitas requisições

      return () => clearTimeout(timer);
    }
  }, [snapshot, tasksList, insightsFetchInsights]);

  const persistTaskPreferences = useCallback(
    async (
      patch: Partial<TaskPreferences> & {
        priorityMap?: Record<string, string | null | undefined>;
        boardOrder?: Record<string, string[]>;
        pinnedTaskIds?: string[];
        contextTemplate?: TaskPreferences["contextTemplate"];
      }
    ) => {
      if (!taskPrefsReady) return;
      const updated = await api.updateTaskPreferences(patch);
      tasksApplyTaskPreferences(updated);
    },
    [api, tasksApplyTaskPreferences, taskPrefsReady]
  );

  const priorityDescriptors = useMemo(() => {
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const build = (
      value: string,
      label: string,
      color: string,
      indicator: string,
      synonyms: string[]
    ) => ({
      value,
      label,
      color,
      indicator,
      synonyms: synonyms.map((item) => normalize(item)),
    });
    return [
      build("p1", "Prioridade 1", "text-rose-400", "bg-rose-500", [
        "p1",
        "priority1",
        "priority_1",
        "prioridade1",
        "alta",
        "urgent",
        "urgente",
        "high",
      ]),
      build("p2", "Prioridade 2", "text-amber-300", "bg-amber-400", [
        "p2",
        "priority2",
        "priority_2",
        "prioridade2",
        "media",
        "média",
        "medium",
      ]),
      build("p3", "Prioridade 3", "text-sky-300", "bg-sky-400", [
        "p3",
        "priority3",
        "priority_3",
        "prioridade3",
        "baixa",
        "low",
      ]),
      build("p4", "Prioridade 4", "text-zinc-400", "bg-zinc-500", [
        "p4",
        "priority4",
        "priority_4",
        "prioridade4",
      ]),
    ];
  }, []);

  const getPriorityDescriptor = useCallback(
    (value?: string | null) => {
      if (!value) return null;
      const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
      return (
        priorityDescriptors.find((descriptor) =>
          descriptor.synonyms.includes(normalized)
        ) || null
      );
    },
    [priorityDescriptors]
  );

  const resolvePriorityWeight = useCallback(
    (priority?: string | null) => {
      if (!priority) return priorityDescriptors.length + 1;
      const descriptor = getPriorityDescriptor(priority);
      if (!descriptor) return priorityDescriptors.length;
      const index = priorityDescriptors.findIndex(
        (item) => item.value === descriptor.value
      );
      return index === -1 ? priorityDescriptors.length : index;
    },
    [getPriorityDescriptor, priorityDescriptors]
  );

  const sortOptions = useMemo(
    () =>
      [
        { id: "natural", label: "Ordem original", value: "natural" },
        { id: "due", label: "Prazo", value: "due" },
        { id: "priority", label: "Prioridade", value: "priority" },
        { id: "project", label: "Projeto", value: "project" },
      ] as const,
    []
  );
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isResizingRef = useRef(false);
  const collectionId = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get("collection");
  }, [searchParamsString]);
  const quickAction = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get("action");
  }, [searchParamsString]);
  const viewMode = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get("view");
  }, [searchParamsString]);

  const setViewParam = useCallback(
    (view: string | null) => {
      const params = new URLSearchParams(searchParamsString);
      if (view) {
        params.set("view", view);
      } else {
        params.delete("view");
      }
      const searchValue = params.toString();
      router.replace(`${pathname}${searchValue ? `?${searchValue}` : ""}`);
    },
    [pathname, router, searchParamsString]
  );

  const handleUtilitySelect = useCallback(
    (utility: UtilityView) => {
      uiSetActiveUtility(utility);
      if (utility === "inbox") {
        setViewParam("inbox");
      } else if (utility === "dailyNotes") {
        setViewParam("daily");
      } else {
        setViewParam(null);
      }
    },
    [setViewParam, uiSetActiveUtility]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prefs = await api.getTaskPreferences();
        if (!cancelled && prefs) {
          tasksApplyTaskPreferences(prefs);
        }
      } catch (error) {
        console.error("Failed to load task preferences", error);
      } finally {
        if (!cancelled) {
          setTaskPrefsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, tasksApplyTaskPreferences]);

  useEffect(() => {
    if (!viewMode) return;
    if (viewMode === "inbox") {
      uiSetActiveUtility("inbox");
    } else if (viewMode === "daily") {
      uiSetActiveUtility("dailyNotes");
    } else if (viewMode === "tasks") {
      uiSetActiveUtility("tasks");
    }
  }, [viewMode, uiSetActiveUtility]);

  const handleResizeMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      uiHandleResizeStart(event.clientX);
    },
    [uiHandleResizeStart]
  );

  const handleResizeTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return;
      uiHandleResizeStart(event.touches[0].clientX);
    },
    [uiHandleResizeStart]
  );

  const createConversationWithContext = useCallback(async () => {
    const params = new URLSearchParams(searchParamsString);
    const collectionId = params.get("collection");

    const conversation = await api.createConversation({
      contextType: collectionId ? "project" : "global",
      contextProjectId: collectionId || undefined,
    });

    timelineSetActiveConversation(conversation);
    timelineSetChatMessages([]);
    timelineSetStreamingMessage("");
    timelineSetToolEvents([]);
    timelineSetChatMode("conversation");
    timelineSetIsTimelineCollapsed(false);

    return conversation;
  }, [
    api,
    searchParamsString,
    timelineSetActiveConversation,
    timelineSetChatMessages,
    timelineSetStreamingMessage,
    timelineSetThinkingMessage,
    timelineSetChatMode,
    timelineSetIsTimelineCollapsed,
  ]);
  const openConversationFromHistory = useCallback(
    async (conversationId: string) => {
      try {
        setChatLoading(true);
        const conversation = await api.getConversation(conversationId);
        if (!conversation) {
          toast.error("Conversa não encontrada.");
          return;
        }
        timelineSetActiveConversation(conversation);
        timelineSetChatMessages(
          Array.isArray(conversation.messages) ? conversation.messages : []
        );
        timelineSetStreamingMessage("");
        timelineSetChatMode("conversation");
        timelineSetIsTimelineCollapsed(false);
      } catch (error) {
        console.error("Failed to open conversation:", error);
        toast.error("Não foi possível carregar a conversa selecionada.");
      } finally {
        setChatLoading(false);
      }
    },
    [
      api,
      timelineSetActiveConversation,
      timelineSetChatMessages,
      timelineSetStreamingMessage,
      timelineSetThinkingMessage,
      timelineSetChatMode,
      timelineSetIsTimelineCollapsed,
    ]
  );

  const handleSelectConversationFromList = useCallback(
    async (conversationId: string) => {
      await openConversationFromHistory(conversationId);
    },
    [openConversationFromHistory]
  );

  const handleBackToTimeline = useCallback(() => {
    timelineSetChatMode("timeline");
    timelineSetActiveConversation(null);
    timelineSetChatMessages([]);
    timelineSetStreamingMessage("");
    timelineSetComposerValue("");
  }, [
    timelineSetChatMode,
    timelineSetActiveConversation,
    timelineSetChatMessages,
    timelineSetStreamingMessage,
    timelineSetComposerValue,
  ]);

  const handleDeleteConversationFromList = useCallback(
    async (conversationId: string) => {
      try {
        await api.deleteConversation(conversationId);
        setConversationList((prev) =>
          prev.filter((conversation) => conversation.id !== conversationId)
        );
        void refreshConversationList();
        if (timeline.activeConversation?.id === conversationId) {
          handleBackToTimeline();
        }
        toast.success("Conversa removida.");
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        toast.error("Não foi possível remover a conversa.");
      }
    },
    [
      api,
      timeline.activeConversation?.id,
      handleBackToTimeline,
      refreshConversationList,
    ]
  );

  const handleCreateConversationFromList = useCallback(async () => {
    try {
      const conversation = await createConversationWithContext();
      if (!conversation) return;
      setConversationList((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.id === conversation.id
        );
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = conversation;
          return next;
        }
        return [conversation, ...prev];
      });
      void refreshConversationList();
    } catch (error) {
      console.error("Failed to create conversation from history:", error);
      toast.error("Não foi possível iniciar uma nova conversa.");
    }
  }, [createConversationWithContext, refreshConversationList]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const conversationId = params.get("conversation");
    if (!conversationId) return;
    if (
      timeline.activeConversation?.id === conversationId &&
      timeline.chatMode === "conversation"
    ) {
      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.delete("conversation");
      const nextSearch = nextParams.toString();
      router.replace(`${pathname}${nextSearch ? `?${nextSearch}` : ""}`);
      return;
    }
    openConversationFromHistory(conversationId).finally(() => {
      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.delete("conversation");
      const nextSearch = nextParams.toString();
      router.replace(`${pathname}${nextSearch ? `?${nextSearch}` : ""}`);
    });
  }, [
    timeline.activeConversation?.id,
    timeline.chatMode,
    openConversationFromHistory,
    pathname,
    router,
    searchParamsString,
  ]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      // Ensure UI switches to conversation mode when user starts chatting
      timelineSetChatMode("conversation");

      if (!activeSelection?.provider || !activeSelection?.model) {
        toast.error(
          "Configure um provedor e modelo de IA nas configurações antes de usar o chat."
        );
        return;
      }

      const providerOverride = {
        provider: activeSelection.provider,
        model: activeSelection.model,
        customProviderId: activeSelection.customProviderId,
        temperature: activeSelection.temperature,
        maxTokens: activeSelection.maxTokens,
      };

      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: trimmedContent,
        createdAt: new Date().toISOString(),
      };

      let conversation = timeline.activeConversation;
      let conversationReady = Boolean(conversation);

      // streaming state locals (acessíveis no finally)
      let streamedContent = "";
      let thinkingContent = "";
      let isInThinkingPhase = true; // inicia como true para exibir placeholder
      const localToolEvents: typeof timelineToolEvents = [];
      let responsePersisted = false;

      const shouldAppendAssistant = (list: ChatMessage[], content: string) => {
        const lastAssistant = [...list].reverse().find((m) => m.role === "assistant");
        return !lastAssistant || lastAssistant.content !== content;
      };

      const buildFocusSummary = (tools: typeof timelineToolEvents) => {
        for (const tool of tools) {
          const out = tool.output as any;
          const focus =
            out?.structuredContent?.result?.focus ||
            out?.structuredContent?.focus ||
            out?.result?.focus;
          if (!focus) continue;

          const daily = Array.isArray(focus.daily_notes) ? focus.daily_notes : [];
          const weekly = focus.weekly_focus;
          const parts: string[] = [];

          if (daily.length > 0) {
            parts.push("### 📅 Foco diário");
            daily.slice(0, 3).forEach((note: any) => {
              parts.push(
                `- **${note.title || note.path}** — ${note.excerpt ? note.excerpt.slice(0, 160) + "..." : ""}`
              );
            });
          }

          if (weekly) {
            parts.push("### 🔥 Foco semanal");
            parts.push(
              `- **${weekly.title || weekly.path || "Sem título"}** — ${weekly.excerpt ? weekly.excerpt.slice(0, 200) + "..." : ""}`
            );
          }

          if (parts.length > 0) {
            return ["## Seu foco atual", ...parts].join("\n");
          }
        }
        return "";
      };

      const buildProjectsSummary = (tools: typeof timelineToolEvents) => {
        for (const tool of tools) {
          const name = (tool.resolvedName || tool.name || "").toLowerCase();
          if (!name.includes("vault") && !name.includes("project") && !name.includes("list"))
            continue;
          const out = tool.output as any;
          const files =
            out?.structuredContent?.result?.files ||
            out?.structuredContent?.files ||
            out?.result?.files ||
            out?.files;
          if (!Array.isArray(files) || files.length === 0) continue;
          const dirs = files.filter((f: any) => f.is_directory);
          const list = (dirs.length > 0 ? dirs : files).slice(0, 10);
          const items = list.map(
            (f: any) => `- **${f.name || f.path}** (${f.modified ? String(f.modified).slice(0, 10) : "sem data"})`
          );
          if (items.length > 0) {
            return ["## Projetos encontrados", ...items].join("\n");
          }
        }
        return "";
      };

      const buildTasksSummary = (tools: typeof timelineToolEvents) => {
        for (const tool of tools) {
          const out = tool.output as any;
          const tasks =
            out?.structuredContent?.result?.tasks ||
            out?.structuredContent?.tasks ||
            out?.result?.tasks ||
            out?.tasks;
          if (!Array.isArray(tasks) || tasks.length === 0) continue;
          const top = tasks.slice(0, 10);
          const items = top.map((t: any) => {
            const title = t.title || t.path || t.name || "Tarefa";
            const status = t.status ? ` — ${t.status}` : "";
            const due = t.dueDate || t.due || t.date;
            const dueStr = due ? ` (prazo: ${String(due).slice(0, 10)})` : "";
            return `- **${title}**${status}${dueStr}`;
          });
          if (items.length > 0) {
            return ["## Tarefas encontradas", ...items].join("\n");
          }
        }
        return "";
      };

      const buildGenericSummary = (tools: typeof timelineToolEvents) => {
        const parts: string[] = [];
        tools.forEach((tool) => {
          const name = tool.resolvedName || tool.name || "Tool";
          if (tool.error) {
            parts.push(`- ${name}: erro (${tool.error})`);
            return;
          }
          const out = tool.output;
          if (typeof out === "string") {
            parts.push(`- ${name}: ${out.slice(0, 240)}${out.length > 240 ? "..." : ""}`);
          } else if (out && typeof out === "object") {
            const keys = Object.keys(out as any).slice(0, 5).join(", ");
            parts.push(`- ${name}: dados recebidos (${keys || "sem campos"})`);
          } else {
            parts.push(`- ${name}: executada.`);
          }
        });
        if (parts.length === 0) return "";
        return ["## Resumo das ferramentas", ...parts].join("\n");
      };

      const buildSynthesis = (
        tools: typeof timelineToolEvents,
        question: string
      ): string => {
        const focus = buildFocusSummary(tools);
        if (focus) return `${focus}\n\n> Pergunta: ${question}`;
        const projects = buildProjectsSummary(tools);
        if (projects) return `${projects}\n\n> Pergunta: ${question}`;
        const tasks = buildTasksSummary(tools);
        if (tasks) return `${tasks}\n\n> Pergunta: ${question}`;
        const generic = buildGenericSummary(tools);
        if (generic) return `${generic}\n\n> Pergunta: ${question}`;
        return "";
      };

      try {
        setChatLoading(true);
        // Marca estado de "pensando" sem placeholder visível; conteúdo chega via eventos
        timelineSetThinkingMessage("");
        setIsThinking(true);
        timelineSetStreamingMessage("");

      if (!conversation) {
        conversation = await createConversationWithContext();
        conversationReady = Boolean(conversation);
      }

        if (!conversation) {
          throw new Error("Não foi possível preparar a conversa");
        }

        const conversationId = conversation.id;
        const conversationContext = conversation.contextType || "chat";
        const conversationProjectName = conversation.projectName;
        const conversationNotePath = conversation.contextNotePath;

        const baseMessages =
          timeline.activeConversation?.id === conversationId
            ? timeline.chatMessages
            : conversation.messages ?? [];

        let messageHistoryForPersistence = [...baseMessages];

        timelineSetChatMessages((prev) => [...prev, tempMessage]);

    const savedMessage = await api.addMessage(conversationId, {
      role: "user",
      content: trimmedContent,
    });

        messageHistoryForPersistence = [
          ...messageHistoryForPersistence,
          savedMessage,
        ];

        timelineSetChatMessages((prev) =>
          prev.map((message) =>
            message.id === tempMessage.id ? savedMessage : message
          )
        );

        timelineSetStreamingMessage(STREAMING_PLACEHOLDER);
        timelineSetToolEvents([]);

        await api.chatStream(
          [
            {
              role: "system",
              content: [
                "Você é uma assistente IA (Sophia) dentro do CEO Dashboard com acesso às ferramentas MCP.",
                "Siga SEMPRE este fluxo (formato shadcn/ai):",
                "1) Raciocine em voz alta, escolhendo quais ferramentas usar (e explique a estratégia).",
                "2) Execute as ferramentas necessárias para responder à pergunta do usuário (projetos, tarefas, notas, foco, etc.). Use quantas precisar.",
                "3) Apresente a resposta final: liste resultados relevantes, destaque prioridades e insira insights concisos. Nunca devolva apenas JSON.",
                "4) Se não houver dados, diga isso e ofereça próximos passos.",
                "IMPORTANTE para criar/editar notas: use sempre write_file com todos os campos obrigatórios (filepath e content). Para notas rápidas, salve em '5 - INSIGHTS-IA/Inbox/<slug>.md' (slug simples do pedido + timestamp) e inclua um título Markdown na primeira linha. Se precisar criar pastas, use createParents=true.",
                "Formato do raciocínio: bloco curto de passos/decisões; depois um bloco final com a resposta em texto claro.",
                "Nunca retorne [object Object]; formate qualquer objeto como texto ou resumo.",
              ].join("\n"),
            },
            ...baseMessages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: "user", content: trimmedContent },
          ],
          conversationId,
          (_chunk) => {
            // deltas agora chegam via onEvent (thinking). Não acrescentar aqui.
          },
          (error) => {
            console.error("Streaming error:", error);
            const message =
              error instanceof Error ? error.message : "Falha no streaming";
            const normalizedStreamMessage = message.toLowerCase();
            const isToolSupportError = normalizedStreamMessage.includes(
              "no endpoints found that support tool use"
            );
            const friendlyMessage = isToolSupportError
              ? "O modelo selecionado não suporta uso de ferramentas MCP. Escolha um provedor/modelo com suporte a ferramentas nas configurações de IA."
              : `Erro ao processar a resposta da IA: ${message}`;
            showErrorToast(friendlyMessage);
            setIsThinking(false);
            timelineSetStreamingMessage(
              isToolSupportError
                ? "⚠️ O modelo selecionado não suporta uso de ferramentas MCP. Ajuste o provedor/modelo nas configurações."
                : `⚠️ Erro ao processar a resposta da IA: ${message}`
            );
          },
          async () => {
            if (isInThinkingPhase) {
              setIsThinking(false);
            }

            if (streamedContent.trim()) {
              const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: streamedContent,
                createdAt: new Date().toISOString(),
              };

              try {
                const savedResponse = await api.addMessage(conversationId, {
                  role: "assistant",
                  content: streamedContent,
                });

                timelineSetChatMessages((prev) =>
                  shouldAppendAssistant(prev, streamedContent)
                    ? [...prev, savedResponse]
                    : prev
                );
                messageHistoryForPersistence = [
                  ...messageHistoryForPersistence,
                  savedResponse,
                ];
                responsePersisted = true;

                const totalMessages = messageHistoryForPersistence.length;
                const shouldPersist =
                  totalMessages >= SAVE_CONVERSATION_INTERVAL &&
                  totalMessages % SAVE_CONVERSATION_INTERVAL === 0;

                if (shouldPersist) {
                  try {
                    await api.saveConversation(
                      conversationId,
                      messageHistoryForPersistence,
                      {
                        source: providerOverride.provider || "system",
                        modelId: activeSelection?.model,
                        timestamp: new Date().toISOString(),
                      }
                    );
                  } catch (brainError) {
                    console.warn(
                      "Erro ao salvar conversation no Brain Cloud (continuando normalmente):",
                      brainError
                    );
                  }
                }
              } catch (saveError) {
                console.error("Error saving streaming response:", saveError);
                timelineSetChatMessages((prev) =>
                  shouldAppendAssistant(prev, streamedContent)
                    ? [...prev, assistantMessage]
                    : prev
                );
                responsePersisted = true;
              }
            } else {
              console.log("Skipping save - empty streaming response");
            }

            timelineSetStreamingMessage("");
            refreshConversationList();
          },
          {
            providerOverride,
            context: conversationContext,
            conversationId,
            tools: true,
            projectName: conversationProjectName,
            contextNotePath: conversationNotePath,
            contextType: conversationContext,
          },
          (event) => {
          if (!event) return;
          if (event.type === "thinking") {
            thinkingContent += event.content;
            timelineSetThinkingMessage(thinkingContent);
            setIsThinking(true);
            return;
          }
          if (event.type === "content") {
            // Antes de executar ferramenta, trate deltas como raciocínio; após ferramentas, como resposta
            if (localToolEvents.length === 0 && isInThinkingPhase) {
              thinkingContent += event.content;
              timelineSetThinkingMessage(thinkingContent);
              setIsThinking(true);
            } else {
              isInThinkingPhase = false;
              setIsThinking(false);
              streamedContent += event.content;
              timelineSetStreamingMessage((prev) =>
                !prev || prev === STREAMING_PLACEHOLDER
                  ? event.content
                  : `${prev}${event.content}`
              );
            }
            return;
          }
          if (event.type === "tool_summary") {
            // Não misturar resumo de ferramenta no texto final; renderizamos nos cards
            return;
          }
          if (event.type === "tool_result") {
            isInThinkingPhase = false;
            setIsThinking(false);
            const payload = event.data || {};
            const toolId = `tool-${Date.now()}-${Math.random()
              .toString(16)
              .slice(2)}`;
            localToolEvents.push({
              id: toolId,
              name: payload.name || payload.resolvedName || "tool",
              resolvedName: payload.resolvedName || payload.name,
              arguments: payload.arguments,
              output: payload.output ?? payload.raw ?? null,
              error: payload.error || null,
              createdAt: Date.now(),
            });
            timelineSetToolEvents((prev) => [
              ...prev,
              {
                id: toolId,
                name: payload.name || payload.resolvedName || "tool",
                resolvedName: payload.resolvedName || payload.name,
                arguments: payload.arguments,
                output: payload.output ?? payload.raw ?? null,
                error: payload.error || null,
                createdAt: Date.now(),
              },
            ]);
            return;
          }
        }
      );
      } catch (error) {
        console.error("Error sending message:", error);
        const message =
          error instanceof Error ? error.message : "Falha desconhecida";
        const normalizedCatchMessage = message.toLowerCase();
        const toolSupportError = normalizedCatchMessage.includes(
          "no endpoints found that support tool use"
        );
          const friendlyCatchMessage = toolSupportError
            ? "O modelo selecionado não suporta uso de ferramentas MCP. Escolha um provedor/modelo com suporte a ferramentas nas configurações de IA."
            : conversationReady
            ? `Erro ao processar a resposta da IA: ${message}`
            : `Erro ao iniciar conversa: ${message}`;
          showErrorToast(friendlyCatchMessage);
          const assistantContent = toolSupportError
            ? "⚠️ O modelo selecionado não suporta uso de ferramentas MCP. Escolha um provedor/modelo com suporte a ferramentas nas configurações de IA."
            : `⚠️ Não foi possível concluir esta solicitação.\n\n${message}`;

          const assistantErrorMessage: ChatMessage = {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            content: assistantContent,
            createdAt: new Date().toISOString(),
          };
          timelineSetChatMessages((prev) => [...prev, assistantErrorMessage]);
          timelineSetStreamingMessage("");
          setIsThinking(false);
          responsePersisted = true;
        } finally {
          setChatLoading(false);
          timelineSetStreamingMessage("");
          setIsThinking(false);

          // Sempre gera uma resposta final com base nas ferramentas, se houver
          if (!responsePersisted && localToolEvents.length > 0) {
            const synthesis = buildSynthesis(localToolEvents, trimmedContent);
              if (synthesis) {
                const assistantMessage: ChatMessage = {
                  id: `assistant-${Date.now()}`,
                  role: "assistant",
                  content: synthesis,
                  createdAt: new Date().toISOString(),
                };
                timelineSetChatMessages((prev) =>
                  shouldAppendAssistant(prev, synthesis) ? [...prev, assistantMessage] : prev
                );
                responsePersisted = true;
                return;
              }
            }
          }
        },
    [
      activeSelection,
      api,
      createConversationWithContext,
      timeline.activeConversation,
      timeline.chatMessages,
      timelineSetChatMessages,
      timelineSetStreamingMessage,
      timelineSetThinkingMessage,
      refreshConversationList,
    ]
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "ggai.layout.panelRatio",
      ui.rightPanelRatio.toString()
    );
  }, [ui.rightPanelRatio]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      event.preventDefault();
      uiUpdatePanelRatio(event.clientX);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isResizingRef.current || event.touches.length !== 1) return;
      uiUpdatePanelRatio(event.touches[0].clientX);
    };

    const stopResizing = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopResizing);
    window.addEventListener("touchcancel", stopResizing);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopResizing);
      window.removeEventListener("touchcancel", stopResizing);
    };
  }, [uiUpdatePanelRatio]);

  useEffect(() => {
    const cleanup = getDashboardCollections();
    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [getDashboardCollections]);

  useEffect(() => {
    if (ui.activeUtility !== "inbox") return;
    let cancelled = false;
    const fetchInbox = async () => {
      try {
        inboxSetInboxLoading(true);
        const notes = await api.getInboxNotes(20);
        if (!cancelled) {
          inboxSetInboxNotes(notes);
          inboxSetInboxError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Falha ao carregar notas da inbox.";
          inboxSetInboxError(message);
        }
      } finally {
        if (!cancelled) {
          inboxSetInboxLoading(false);
        }
      }
    };
    fetchInbox();
    return () => {
      cancelled = true;
    };
  }, [
    ui.activeUtility,
    api,
    inboxSetInboxLoading,
    inboxSetInboxNotes,
    inboxSetInboxError,
  ]);

  useEffect(() => {
    if (ui.activeUtility !== "inbox") {
      inboxSetExpandedInboxPath(null);
      inboxSetExpandedInboxContent(null);
      inboxSetExpandedInboxFrontmatter(null);
      inboxSetExpandedInboxError(null);
    }
  }, [
    ui.activeUtility,
    inboxSetExpandedInboxPath,
    inboxSetExpandedInboxContent,
    inboxSetExpandedInboxFrontmatter,
    inboxSetExpandedInboxError,
  ]);

  useEffect(() => {
    if (ui.activeUtility !== "search") {
      tasksSetSearchTerm("");
    }
  }, [ui.activeUtility, tasksSetSearchTerm]);

  useEffect(() => {
    if (ui.activeUtility !== "tasks") {
      tasksSetSelectedTaskId(null);
      tasksSetSelectedTaskPath(null);
      tasksSetSelectedTaskTitle(null);
      tasksSetSelectedTaskHeading(null);
      tasksSetSelectedTaskContent(null);
      tasksSetSelectedTaskError(null);
    }
  }, [
    ui.activeUtility,
    tasksSetSelectedTaskId,
    tasksSetSelectedTaskPath,
    tasksSetSelectedTaskTitle,
    tasksSetSelectedTaskHeading,
    tasksSetSelectedTaskContent,
    tasksSetSelectedTaskError,
  ]);

  useEffect(() => {
    if (ui.activeUtility === "search" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [ui.activeUtility]);

  useEffect(() => {
    if (!openPriorityMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("[data-priority-menu]") ||
        target.closest("[data-priority-trigger]")
      ) {
        return;
      }
      setOpenPriorityMenuId(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openPriorityMenuId]);

  useEffect(() => {
    if (!showSortMenu) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("[data-sort-menu]") ||
        target.closest("[data-sort-trigger]")
      ) {
        return;
      }
      setShowSortMenu(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showSortMenu]);

  const focusSummary = useMemo(() => {
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
    tasksSetBoardOrder((prev) => {
      const columns = new Set([
        "overdue",
        "today",
        "upcoming",
        ...Object.keys(prev || {}),
      ]);
      const taskMap: Record<string, string[]> = {};
      tasksWithPreferences.forEach((task) => {
        const column = task.status || "upcoming";
        if (!taskMap[column]) taskMap[column] = [];
        taskMap[column].push(task.id);
      });
      let changed = false;
      const nextLayout: Record<string, string[]> = {};
      columns.forEach((column) => {
        const currentIds = Array.isArray(prev?.[column]) ? prev[column] : [];
        const validIds = taskMap[column] || [];
        const filtered = currentIds.filter((id) => validIds.includes(id));
        const missing = validIds.filter((id) => !filtered.includes(id));
        const updated = [...filtered, ...missing];
        if (
          !changed &&
          (updated.length !== currentIds.length ||
            updated.some((id, index) => currentIds[index] !== id))
        ) {
          changed = true;
        }
        nextLayout[column] = updated;
      });
      return changed ? nextLayout : prev;
    });
  }, [tasksWithPreferences, tasksSetBoardOrder]);

  const now = useMemo(() => new Date(), []);
  const agendaBuckets = useMemo(() => {
    const result = {
      today: [] as Array<{ title: string; time?: string }>,
      upcoming: [] as Array<{ title: string; label: string }>,
    };
    const deadlines = snapshot?.data?.timeContext?.upcoming_deadlines || [];

    const isSameDay = (dateA: Date, dateB: Date) =>
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate();

    deadlines.forEach((deadline) => {
      const due = deadline.due_date ? new Date(deadline.due_date) : null;
      if (due && isSameDay(due, now)) {
        const timeLabel = deadline.due_time
          ? formatTimeShort(deadline.due_time)
          : undefined;
        result.today.push({
          title: deadline.title,
          time: timeLabel,
        });
      } else {
        result.upcoming.push({
          title: deadline.title,
          label: due
            ? due.toLocaleDateString(undefined, {
                weekday: "short",
                day: "2-digit",
              })
            : "Em breve",
        });
      }
    });

    return result;
  }, [snapshot, now]);

  const baseTimelineCards = useMemo<TimelineCard[]>(() => {
    if (!snapshot) return [];

    const cards: TimelineCard[] = [];
    const focus = snapshot.data?.focus;
    const timeContext = snapshot.data?.timeContext;
    const tasksData = snapshot.data?.tasks;

    // 🧠 PRIORIDADE 1: Insights de Tarefas com Inteligência
    if (
      tasksData?.summary?.recommendations &&
      tasksData.summary.recommendations.length > 0
    ) {
      const topRecommendation = tasksData.summary.recommendations[0];
      cards.push({
        id: "ai-insight-tasks",
        type: "insight",
        title: "💡 Insight de Prioridades",
        body: topRecommendation,
        impact: "Tarefas Brain Cloud",
        confidence: 0.85,
        tags: ["#prioridades", "#produtividade", "#braincloud"],
        timestamp: "Agora",
      });
    }

    // 🎯 PRIORIDADE 2: Foco Semanal do Vault
    if (focus?.weekly_focus) {
      cards.push({
        id: "focus-weekly",
        type: "insight",
        title: "🎯 Foco Semanal",
        body: focus.weekly_focus.excerpt || "Resumo não disponível.",
        impact: (focus.metadata?.weekly_goal as string) || "Prioridade semanal",
        confidence: 0.9,
        tags: focus.weekly_focus.tags || ["#semana", "#foco"],
        timestamp: focus.weekly_focus.modified
          ? new Date(focus.weekly_focus.modified).toLocaleString()
          : "Esta semana",
      });
    }

    // 📋 PRIORIDADE 3: Tarefas Críticas
    if (
      tasksData?.metrics &&
      (tasksData.metrics.overdue > 0 || tasksData.metrics.dueToday > 0)
    ) {
      cards.push({
        id: "critical-tasks",
        type: "message",
        author: "assistant",
        title: "⚠️ Tarefas Críticas",
        body: `Você tem **${tasksData.metrics.overdue} tarefa(s) atrasada(s)** e **${tasksData.metrics.dueToday} para hoje**. Estão priorizadas no painel de tarefas.`,
        timestamp: formatTimestampLabel(snapshot.generatedAt),
        actions: [
          { label: "Ver tarefas", icon: <ListTodo className="h-4 w-4" /> },
          {
            label: "Organizar por prioridade",
            icon: <Sparkles className="h-4 w-4" />,
          },
        ],
      });
    }

    // 📅 PRIORIDADE 4: Contexto Temporal
    const activities = timeContext?.recent_activities || [];
    if (activities.length > 0) {
      activities.slice(0, 2).forEach((activity, index) => {
        cards.push({
          id: `recent-activity-${index}`,
          type: "note",
          title: activity.title || "Atualização recente",
          snippet: activity.summary || activity.path || "Alteração registrada.",
          related: activity.tags || [],
          timestamp: activity.modified
            ? new Date(activity.modified).toLocaleString()
            : "Recente",
        });
      });
    }

    // 📋 PRIORIDADE 5: Próximos Prazos
    const deadlines = timeContext?.upcoming_deadlines || [];
    if (deadlines.length > 0) {
      const summary = deadlines
        .slice(0, 3)
        .map((deadline) => {
          const dueDate = deadline.due_date
            ? new Date(deadline.due_date)
            : null;
          const label = dueDate
            ? `${dueDate.toLocaleDateString(undefined, {
                weekday: "short",
              })} • ${dueDate.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "2-digit",
              })}`
            : "Sem data";
          return `${label} — ${deadline.title}`;
        })
        .join("\n");

      cards.push({
        id: "upcoming-deadlines",
        type: "agent",
        title: "📅 Próximos Compromissos",
        status: "scheduled",
        description: summary,
        timestamp: formatTimestampLabel(snapshot.generatedAt),
        nextRun: `${deadlines.length} próximos compromissos`,
      });
    }

    // ⚠️ Avisos do Sistema
    snapshot.warnings?.forEach((warning, index) => {
      cards.push({
        id: `warning-${index}`,
        type: "message",
        author: "assistant",
        title: `⚠️ Ajuste necessário • ${warning.scope || "Integração"}`,
        body: warning.message,
        timestamp: formatTimestampLabel(snapshot.generatedAt),
      });
    });

    // Se não houver conteúdo, retorna vazio
    return cards;
  }, [snapshot]);

  const timelineCards = useMemo(() => {
    if (timeline.liveTimelineCards.length === 0) {
      return baseTimelineCards;
    }
    return [...timeline.liveTimelineCards, ...baseTimelineCards];
  }, [baseTimelineCards, timeline.liveTimelineCards]);

  const pinnedInsights = useMemo(() => {
    const insights: Array<{
      id: string;
      title: string;
      description: string;
      source: string;
    }> = [];

    // 1️⃣ Prioridade: Insights semânticos do Brain Cloud
    if (insightsList.length > 0) {
      insightsList.slice(0, 2).forEach((insight, index) => {
        const pathLabel = insight.path
          ? insight.path.split("/").pop()
          : "Insight";
        const excerpt = insight.excerpt ?? "";
        const scoreLabel =
          typeof insight.score === "number"
            ? `${Math.round(insight.score * 100)}%`
            : "—";

        insights.push({
          id: `semantic-${index}`,
          title: `🧠 ${pathLabel}`,
          description:
            excerpt.length > 0
              ? `${excerpt.slice(0, 120)}${excerpt.length > 120 ? "..." : ""}`
              : "Resumo não disponível.",
          source: `Busca semântica • Score: ${scoreLabel}`,
        });
      });
    }

    // 2️⃣ Recomendações de tarefas
    const recommendations = snapshot?.data?.tasks?.summary?.recommendations;
    if (recommendations && recommendations.length > 0) {
      recommendations.slice(0, 2).forEach((recommendation, index) => {
        insights.push({
          id: `recommendation-${index}`,
          title: `📋 Recomendação ${index + 1}`,
          description: recommendation,
          source: "Resumo de tarefas • Brain Cloud",
        });
      });
    }

    // Limitar a 3 insights pinned
    return insights.slice(0, 3);
  }, [snapshot, insightsList]);

  const agentCards = useMemo<AgentCardData[]>(() => {
    const runs = snapshot?.data?.agents?.recentRuns;
    if (runs && runs.length > 0) {
      return runs.slice(0, 3).map(buildAgentCard);
    }
    return [];
  }, [snapshot]);

  const dailyNotesList = useMemo(() => {
    const notes = snapshot?.data?.focus?.daily_notes || [];
    return notes.map((note, index) => {
      const vaultPath =
        typeof note.path === "string" && note.path.trim().length > 0
          ? note.path
          : null;
      const fallbackId = `${note.title || "nota"}-${index}`;
      return {
        id: vaultPath ?? fallbackId,
        path: vaultPath ?? fallbackId,
        vaultPath,
        title: note.title || "Nota diária",
        excerpt: note.excerpt || "Sem resumo disponível.",
        modified: note.modified,
        tags: Array.isArray(note.tags)
          ? note.tags.map((tag: unknown) => String(tag))
          : undefined,
        frontmatter: note?.frontmatter ?? undefined,
      };
    });
  }, [snapshot]);

  const _workflowTemplates = useMemo(
    () => [
      {
        id: "weekly-review",
        title: "Weekly Review",
        description:
          "Checklist para consolidar notas, tarefas e insights da semana.",
      },
      {
        id: "brainstorm-sync",
        title: "Brainstorm Assistido",
        description:
          "Fluxo guiado para gerar ideias com apoio do Snapshot atual.",
      },
      {
        id: "board-update",
        title: "Atualização do Board",
        description: "Resumo executivo das principais decisões e riscos.",
      },
    ],
    []
  );

  const availableMcpTools = useMemo(
    () => [
      {
        id: "mcp_get_focus",
        title: "mcp_get_focus",
        description: "Retorna foco diário e notas relevantes.",
      },
      {
        id: "mcp_get_tasks",
        title: "mcp_get_tasks",
        description: "Lista tarefas por janela (week, today, overdue).",
      },
      {
        id: "mcp_semantic_search",
        title: "mcp_semantic_search",
        description: "Busca semântica no vault com embeddings.",
      },
      {
        id: "mcp_get_vault_tree",
        title: "mcp_get_vault_tree",
        description: "Estrutura do vault para navegação rápida.",
      },
    ],
    []
  );

  const shortcutList = useMemo(
    () => [
      { combo: ["Cmd", "K"], description: "Abrir busca/command palette" },
      { combo: ["Cmd", "Shift", "N"], description: "Capturar nova nota" },
      {
        combo: ["Cmd", "Shift", "T"],
        description: "Criar tarefa a partir do contexto",
      },
      {
        combo: ["Cmd", "Shift", "F"],
        description: "Alternar modo foco (ocultar blocos 1 e 4)",
      },
    ],
    []
  );

  const searchableCards = useMemo(
    () =>
      timelineCards.map((card) => ({
        id: card.id,
        title: card.title,
        excerpt:
          card.type === "message"
            ? card.body
            : card.type === "insight"
            ? card.body
            : card.type === "note"
            ? card.snippet
            : card.description,
        type: card.type,
      })),
    [timelineCards]
  );

  const searchResults = useMemo(() => {
    const term = tasks.searchTerm.trim().toLowerCase();
    if (term.length < 2) return [];
    return searchableCards
      .filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.excerpt?.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [tasks.searchTerm, searchableCards]);

  useEffect(() => {
    setExpandedDailyPath(null);
    setExpandedDailyContent(null);
    setExpandedDailyError(null);
    setExpandedDailyTitle(null);
    setExpandedDailyFrontmatter(null);
  }, [snapshot?.data?.focus?.daily_notes]);

  const chatThreads = useMemo<ChatThread[]>(() => {
    const threads = (snapshot?.data as Record<string, unknown>)
      ?.conversations as { threads?: unknown[] };
    if (Array.isArray(threads?.threads) && threads.threads.length > 0) {
      return threads.threads
        .map((thread: Record<string, unknown>, index: number) => ({
          id: thread?.id ?? `thread-${index}`,
          title: thread?.title ?? thread?.topic ?? `Conversa ${index + 1}`,
          summary:
            thread?.summary ??
            thread?.lastMessage ??
            "Conversa recente com o Cognito.",
          updatedAt:
            thread?.updatedAt ?? thread?.updated_at ?? new Date().toISOString(),
          messageCount: thread?.messageCount ?? thread?.messages_count ?? 0,
          tags: Array.isArray(thread?.tags) ? thread.tags : undefined,
          pinned: Boolean(thread?.pinned),
        }))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    }
    return [];
  }, [snapshot]);

  const chatThreadsByRecency = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const recent: ChatThread[] = [];
    const older: ChatThread[] = [];
    chatThreads.forEach((thread) => {
      const updated = Date.parse(thread.updatedAt);
      if (Number.isNaN(updated)) {
        older.push(thread);
        return;
      }
      if (now - updated <= sevenDays) {
        recent.push(thread);
      } else {
        older.push(thread);
      }
    });
    return { recent, older };
  }, [chatThreads]);

  const chatHistoryItems = useMemo<ChatHistoryItem[]>(() => {
    if (conversationList.length > 0) {
      return conversationList
        .map((conversation) => {
          const updatedAt =
            conversation.updatedAt ||
            conversation.createdAt ||
            new Date().toISOString();
          return {
            id: conversation.id,
            title: conversation.title || "Conversa",
            summary:
              conversation.lastMessagePreview ?? conversation.projectName ?? undefined,
            messageCount:
              conversation.messageCount ??
              (Array.isArray(conversation.messages)
                ? conversation.messages.length
                : 0),
            updatedAt,
            tags: conversation.detectedTags,
          };
        })
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    }

    return chatThreadsByRecency.recent
      .concat(chatThreadsByRecency.older)
      .map((thread) => ({
        id: thread.id,
        title: thread.title,
        summary: thread.summary,
        messageCount: thread.messageCount,
        updatedAt: thread.updatedAt,
        tags: thread.tags,
      }));
  }, [conversationList, chatThreadsByRecency]);

  const utilityButtons: DockButton[] = useMemo(
    () => [
      { id: "tasks", label: "Tasks", icon: ListTodo },
      { id: "inbox", label: "Inbox", icon: Inbox },
      { id: "dailyNotes", label: "Daily", icon: BookOpen },
      { id: "workflows", label: "Flows", icon: Workflow },
      { id: "search", label: "Search", icon: SearchIcon },
      { id: "agents", label: "Agents", icon: Sparkles },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "chatHistory", label: "Chats", icon: MessageSquare },
      { id: "knowledgeGraph", label: "Graph", icon: Network },
      { id: "analytics", label: "Analytics", icon: BarChart },
    ],
    []
  );

  const activeUtilityMeta = useMemo(() => {
    if (ui.activeUtility === "shortcuts") {
      return { id: "shortcuts", label: "Shortcuts", icon: Keyboard };
    }
    if (ui.activeUtility === "mcpTools") {
      return { id: "mcpTools", label: "Tools", icon: Cpu };
    }
    return (
      utilityButtons.find((button) => button.id === ui.activeUtility) ??
      utilityButtons[0]
    );
  }, [utilityButtons, ui.activeUtility]);
  const timelineFlex = timeline.isTimelineCollapsed ? 0 : ui.rightPanelRatio;
  const executionFlex = timeline.isTimelineCollapsed
    ? 1
    : Math.max(0.3, 1 - ui.rightPanelRatio);

  const renderUtilityContent = () => {
    if (ui.activeUtility === "inbox") {
      if (inbox.inboxLoading) {
        return (
          <div className="flex h-24 items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            Carregando notas da inbox...
          </div>
        );
      }
      if (inbox.inboxError) {
        return <p className="text-xs text-rose-400">{inbox.inboxError}</p>;
      }
      if (inbox.inboxNotes.length === 0) {
        return (
          <p className="text-xs text-zinc-500">
            Nenhuma nota bruta encontrada na inbox. Capture algo via WhatsApp ou
            composer para alimentar este painel.
          </p>
        );
      }
      return (
        <InboxPanel
          inboxNotes={inbox.inboxNotes}
          inboxLoading={inbox.inboxLoading}
          inboxError={inbox.inboxError}
          expandedInboxPath={inbox.expandedInboxPath}
          expandedInboxContent={inbox.expandedInboxContent}
          expandedInboxFrontmatter={inbox.expandedInboxFrontmatter}
          expandedInboxLoading={inbox.expandedInboxLoading}
          onExpand={handleOpenInboxNote}
        />
      );
    }

    if (ui.activeUtility === "tasks") {
      if (loading) {
        return (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`task-skeleton-${index}`}
                className="h-16 animate-pulse rounded-xl border border-neutral-900 bg-neutral-900/60"
              />
            ))}
          </div>
        );
      }

      const metrics = snapshot?.data?.tasks?.metrics;
      const totalActive =
        (metrics?.overdue ?? 0) +
        (metrics?.dueToday ?? 0) +
        (metrics?.upcoming ?? 0);
      const dueCritical = (metrics?.overdue ?? 0) + (metrics?.dueToday ?? 0);
      const metricsTooltip = metrics
        ? `${dueCritical} tarefas vencidas ou para hoje • ${
            metrics?.upcoming ?? 0
          } próximas`
        : "Métricas de tarefas indisponíveis no momento.";

      const renderListView = () => (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const isActive = tasks.selectedTaskId === task.id;
            const metaParts: string[] = [];
            if (task.project) metaParts.push(task.project);
            if (task.dueDate)
              metaParts.push(`Prazo ${formatDateShort(task.dueDate)}`);
            if (task.dueTime) metaParts.push(formatTimeShort(task.dueTime));
            const descriptor = getPriorityDescriptor(task.priority);
            const isToggling = tasks.togglingTaskId === task.id;

            return (
              <div
                key={task.id}
                role={task.filePath ? "button" : undefined}
                tabIndex={task.filePath ? 0 : -1}
                aria-disabled={!task.filePath}
                onClick={() => task.filePath && handleTaskSelect(task)}
                onKeyDown={(event) => {
                  if (!task.filePath) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleTaskSelect(task);
                  }
                }}
                className={[
                  "group relative flex items-start gap-3 rounded-xl border px-4 py-3 transition",
                  isActive
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-transparent hover:border-neutral-800 hover:bg-neutral-900/60",
                  task.pinned ? "border-amber-500/40 bg-amber-500/10" : "",
                  !task.filePath ? "cursor-not-allowed opacity-60" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleToggleTask(task, true);
                  }}
                  disabled={isToggling}
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                    isToggling
                      ? "border-emerald-500/80 bg-emerald-500/20"
                      : "border-neutral-600 hover:border-emerald-500"
                  }`}
                  aria-label="Concluir tarefa"
                >
                  {isToggling ? (
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-transparent transition group-hover:bg-emerald-400" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {task.pinned && (
                          <Pin className="h-3.5 w-3.5 text-amber-300" />
                        )}
                        <p className="text-sm font-semibold leading-tight text-zinc-100">
                          {task.title}
                        </p>
                      </div>
                      {metaParts.length > 0 && (
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {metaParts.join(" • ")}
                        </p>
                      )}
                      {task.headingContext && (
                        <p className="mt-1 truncate text-[11px] text-zinc-600">
                          {task.headingContext}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                    {task.status === "overdue" && (
                      <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-orange-300">
                        Atraso
                      </span>
                    )}
                    {descriptor && (
                      <span className="rounded-full border border-neutral-800 px-2 py-0.5 text-emerald-300">
                        {descriptor.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleTogglePinTask(task.id);
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition ${
                      task.pinned
                        ? "border-amber-400 bg-amber-500/10 text-amber-200"
                        : "border-neutral-800 bg-neutral-900 text-zinc-400 hover:border-neutral-600 hover:text-zinc-100"
                    }`}
                    title={task.pinned ? "Desafixar" : "Fixar como prioridade"}
                  >
                    <Pin
                      className={`h-4 w-4 ${
                        task.pinned ? "fill-amber-300 text-amber-300" : ""
                      }`}
                    />
                  </button>
                  <div className="relative" data-priority-menu-root>
                    <button
                      type="button"
                      data-priority-trigger
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenPriorityMenuId((prev) =>
                          prev === task.id ? null : task.id
                        );
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition ${
                        descriptor
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-neutral-800 bg-neutral-900 text-zinc-400 hover:border-neutral-600 hover:text-zinc-100"
                      }`}
                      title="Definir prioridade"
                    >
                      <Flag
                        className={`h-4 w-4 ${
                          descriptor ? descriptor.color : "text-zinc-400"
                        }`}
                      />
                    </button>
                    {openPriorityMenuId === task.id && (
                      <div
                        data-priority-menu
                        className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-2xl"
                      >
                        {priorityDescriptors.map((level) => (
                          <button
                            key={level.value}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 transition hover:bg-neutral-900 ${
                              descriptor?.value === level.value
                                ? "text-emerald-300"
                                : ""
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleChangeTaskPriority(task.id, level.value);
                            }}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${level.indicator}`}
                            />
                            {level.label}
                          </button>
                        ))}
                        <button
                          className="mt-1 w-full rounded-lg border border-neutral-800 px-3 py-2 text-xs text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleChangeTaskPriority(task.id, null);
                          }}
                        >
                          Remover prioridade
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );

      const renderBoardView = () => (
        <div className="grid gap-3 md:grid-cols-3">
          {boardColumns.map((column) => {
            const order = tasks.boardOrder[column.id] || [];
            const columnTasks = order
              .map((taskId) => tasksById.get(taskId))
              .filter((value): value is Task => Boolean(value));
            const isDropTarget =
              tasks.boardDragState?.taskId &&
              tasks.boardDragState?.fromColumn !== column.id;

            return (
              <div
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const droppedId =
                    tasks.boardDragState?.taskId ||
                    event.dataTransfer.getData("application/task-id");
                  if (droppedId) {
                    handleBoardDrop(droppedId, column.id);
                  }
                }}
                className={`flex min-h-[260px] flex-col rounded-xl border border-neutral-800 bg-neutral-950/80 transition ${
                  isDropTarget ? "border-emerald-500/40" : ""
                }`}
              >
                <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    {column.label}
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 p-3">
                  {columnTasks.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-xs text-zinc-500">
                      Arraste tarefas para organizar este painel.
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const descriptor = getPriorityDescriptor(task.priority);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(event) =>
                            handleBoardDragStart(event, task.id, column.id)
                          }
                          onDragEnd={handleBoardDragEnd}
                          onClick={() =>
                            task.filePath && handleTaskSelect(task)
                          }
                          className="cursor-grab rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-3 text-sm text-zinc-200 transition hover:border-neutral-600"
                        >
                          <p className="font-semibold text-zinc-100">
                            {task.title}
                          </p>
                          {task.project && (
                            <p className="mt-1 text-xs text-zinc-500">
                              {task.project}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                            {task.status === "overdue" && (
                              <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-orange-300">
                                Atraso
                              </span>
                            )}
                            {descriptor && (
                              <span className="rounded-full border border-neutral-800 px-2 py-0.5">
                                {descriptor.label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );

      return (
        <>
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleViewModeChange("list")}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs transition ${
                    tasks.taskViewMode === "list"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-neutral-800 bg-neutral-900 text-zinc-400 hover:border-neutral-600 hover:text-zinc-100"
                  }`}
                  title="Visualização em lista"
                >
                  <ListIcon className="h-4 w-4" />
                  <span>Lista</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange("kanban")}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs transition ${
                    tasks.taskViewMode === "kanban"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-neutral-800 bg-neutral-900 text-zinc-400 hover:border-neutral-600 hover:text-zinc-100"
                  }`}
                  title="Visualização em board"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>Board</span>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    data-sort-trigger
                    onClick={() => setShowSortMenu((prev) => !prev)}
                    className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Ordenar
                  </button>
                  {showSortMenu && (
                    <div
                      data-sort-menu
                      className="absolute left-0 z-30 mt-2 w-48 rounded-xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-2xl"
                    >
                      {sortOptions.map((option) => (
                        <button
                          key={option.id}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-zinc-300 transition hover:bg-neutral-900 ${
                            tasks.taskSortBy === option.value
                              ? "text-emerald-300"
                              : ""
                          }`}
                          onClick={() => handleSortChange(option.value)}
                        >
                          {option.label}
                          {tasks.taskSortBy === option.value && (
                            <Sparkles className="h-4 w-4 text-emerald-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiCleanup}
                  disabled={tasks.aiCleanupLoading}
                  className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
                >
                  {tasks.aiCleanupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI cleanup
                </button>
                <button
                  type="button"
                  onClick={handleOpenCompletedModal}
                  className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
                >
                  <CheckCircle className="h-4 w-4" />
                  Concluídas
                </button>
                <button
                  type="button"
                  onClick={handleOpenContextModal}
                  className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
                >
                  <UserCircle className="h-4 w-4" />
                  User context
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-zinc-300"
                  title={metricsTooltip}
                >
                  <Info className="h-4 w-4 text-zinc-400" />
                  <span>
                    {dueCritical}/{totalActive || filteredTasks.length}
                  </span>
                </button>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 px-4 py-6 text-center text-xs text-zinc-500">
                Nenhuma tarefa disponível agora. Use os agentes ou o foco diário
                para gerar próximas ações.
              </div>
            ) : (
              <div className="min-h-0 overflow-y-auto pr-1">
                {tasks.taskViewMode === "kanban"
                  ? renderBoardView()
                  : renderListView()}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Hoje
                </p>
                <div className="mt-3 space-y-2 text-sm text-zinc-200">
                  {agendaBuckets.today.length > 0 ? (
                    agendaBuckets.today.map((item, index) => (
                      <p key={`today-${index}`}>
                        {item.time ? `${item.time} • ` : ""}
                        {item.title}
                      </p>
                    ))
                  ) : (
                    <p>Nenhum compromisso crítico para hoje.</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Próximos dias
                </p>
                <div className="mt-3 space-y-2 text-sm text-zinc-200">
                  {agendaBuckets.upcoming.length > 0 ? (
                    agendaBuckets.upcoming.map((item, index) => (
                      <p key={`upcoming-${index}`}>
                        {item.label} • {item.title}
                      </p>
                    ))
                  ) : (
                    <p>Sem prazos relevantes nos próximos dias.</p>
                  )}
                </div>
              </div>
            </div>

            {pinnedInsights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Insights Fixados
                </p>
                {pinnedInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
                  >
                    <p className="text-sm font-semibold text-zinc-100">
                      {insight.title}
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      {insight.description}
                    </p>
                    <p className="mt-3 text-[11px] uppercase tracking-wide text-zinc-500">
                      {insight.source}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      );
    }
    if (ui.activeUtility === "dailyNotes") {
      return dailyNotesList.length > 0 ? (
        <div className="space-y-3">
          {dailyNotesList.map((note) => {
            const isExpanded = expandedDailyPath === note.path;
            const enrichedNote = isExpanded
              ? {
                  path: note.path,
                  title: expandedDailyTitle ?? note.title,
                  excerpt: note.excerpt,
                  snippet: note.excerpt,
                  modified: note.modified,
                  tags: note.tags,
                  frontmatter:
                    expandedDailyFrontmatter ?? note.frontmatter ?? undefined,
                  content: expandedDailyContent ?? undefined,
                }
              : {
                  path: note.path,
                  title: note.title,
                  excerpt: note.excerpt,
                  snippet: note.excerpt,
                  modified: note.modified,
                  tags: note.tags,
                  frontmatter: note.frontmatter ?? undefined,
                };

            return (
              <div key={note.id} className="space-y-2">
                <InboxNoteCard
                  note={enrichedNote}
                  isExpanded={isExpanded}
                  onExpand={note.vaultPath ? handleToggleDailyNote : undefined}
                />
                {isExpanded && expandedDailyError && !expandedDailyLoading && (
                  <p className="text-xs text-rose-400">{expandedDailyError}</p>
                )}
              </div>
            );
          })}

          {expandedDailyLoading && expandedDailyPath && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              Carregando conteúdo...
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Sem notas diárias recentes. Capture algo com /nota para começar.
        </p>
      );
    }

    if (ui.activeUtility === "workflows") {
      return <FeedbackLoopTracker />;
    }

    if (ui.activeUtility === "search") {
      return tasks.searchTerm.trim().length < 2 ? (
        <p className="text-xs text-zinc-500">
          Digite ao menos 2 caracteres para buscar nas notas recentes.
        </p>
      ) : searchResults.length > 0 ? (
        <div className="space-y-3">
          {searchResults.map((result) => (
            <div
              key={result.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {result.type}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {result.title}
              </p>
              {result.excerpt && (
                <p className="mt-2 text-sm text-zinc-300 line-clamp-3">
                  {result.excerpt}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Nenhum resultado encontrado. Tente outros termos ou refine o comando.
        </p>
      );
    }

    if (ui.activeUtility === "agents") {
      return (
        <div className="space-y-3">
          {agentCards.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
                  {agent.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {agent.name}
                  </p>
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
      );
    }

    if (ui.activeUtility === "projects") {
      if (collectionsLoading) {
        return (
          <div className="space-y-4">
            <ProjectOverview />
            <div className="space-y-2">
              <div className="h-20 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/50" />
              <div className="h-20 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/50" />
            </div>
          </div>
        );
      }
      if (!collections.length) {
        return (
          <div className="space-y-4">
            <ProjectOverview />
            <p className="text-xs text-zinc-500">
              Crie projetos ou coleções na barra lateral para agrupar notas e
              tarefas vinculadas.
            </p>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          <ProjectOverview />
          <div className="space-y-3">
            {collectionId && (
              <button
                type="button"
                onClick={handleClearProjectFocus}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
              >
                Limpar projeto ativo
              </button>
            )}
            {collections.map((collection) => {
              const _isActive = collection.id === collectionId;
              const projectId = collection.id;
              const projectTitle = collection.label;

              return (
                <ProjectCard
                  key={collection.id}
                  project={{
                    id: projectId,
                    title: projectTitle,
                    status: "ativo",
                    progress: 75,
                  }}
                  onClick={() => handleProjectFocus(collection.id)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    if (ui.activeUtility === "chatHistory") {
      return (
        <ChatHistoryRenderer
          conversations={chatHistoryItems}
          loading={conversationListLoading}
          activeConversationId={timeline.activeConversation?.id ?? null}
          onCreate={handleCreateConversationFromList}
          onSelect={handleSelectConversationFromList}
          onDelete={handleDeleteConversationFromList}
        />
      );
    }

    if (ui.activeUtility === "knowledgeGraph") {
      return (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
          <div className="flex h-[420px] items-center justify-center">
            <div className="text-center">
              <p className="text-zinc-400 mb-2">
                Visualização do Grafo de Conhecimento
              </p>
              <p className="text-zinc-500 text-sm">
                Temporariamente desabilitado para build
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (ui.activeUtility === "mcpTools") {
      return (
        <McpToolsRenderer
          availableMcpTools={availableMcpTools}
          onToolClick={(toolId: string) => {
            console.log(`Tool clicked: ${toolId}`);
          }}
        />
      );
    }

    if (ui.activeUtility === "shortcuts") {
      return <ShortcutsRenderer shortcutList={shortcutList} />;
    }

    if (ui.activeUtility === "workflows") {
      return <WorkflowManager />;
    }

    if (ui.activeUtility === "analytics") {
      return <AnalyticsDashboard />;
    }

    return null;
  };

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
      if (!task.filePath) {
        tasksSetSelectedTaskId(null);
        tasksSetSelectedTaskPath(null);
        tasksSetSelectedTaskTitle(task.title);
        tasksSetSelectedTaskHeading(
          task.headingContext || task.project || null
        );
        tasksSetSelectedTaskContent(null);
        tasksSetSelectedTaskError("Esta tarefa não possui nota vinculada.");
        return;
      }

      if (tasks.selectedTaskId === task.id && !tasks.selectedTaskLoading) {
        tasksSetSelectedTaskId(null);
        tasksSetSelectedTaskPath(null);
        tasksSetSelectedTaskTitle(null);
        tasksSetSelectedTaskHeading(null);
        tasksSetSelectedTaskContent(null);
        tasksSetSelectedTaskError(null);
        return;
      }

      try {
        tasksSetSelectedTaskId(task.id);
        tasksSetSelectedTaskPath(task.filePath);
        tasksSetSelectedTaskTitle(task.title);
        tasksSetSelectedTaskHeading(
          task.headingContext || task.project || null
        );
        tasksSetSelectedTaskLoading(true);
        tasksSetSelectedTaskError(null);
        tasksSetSelectedTaskContent(null);
        const result = await api.getVaultNoteContent(task.filePath);
        tasksSetSelectedTaskContent(result.content || "");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Falha ao carregar a nota vinculada.";
        tasksSetSelectedTaskError(message);
      } finally {
        tasksSetSelectedTaskLoading(false);
      }
    },
    [
      api,
      tasks.selectedTaskId,
      tasks.selectedTaskLoading,
      tasksSetSelectedTaskId,
      tasksSetSelectedTaskPath,
      tasksSetSelectedTaskTitle,
      tasksSetSelectedTaskHeading,
      tasksSetSelectedTaskLoading,
      tasksSetSelectedTaskError,
      tasksSetSelectedTaskContent,
    ]
  );

  const handleToggleTask = useCallback(
    async (task: Task, completed: boolean) => {
      if (tasks.togglingTaskId) return;
      if (!task.filePath) {
        tasksSetSelectedTaskError(
          "Não foi possível atualizar: tarefa sem nota vinculada."
        );
        return;
      }

      try {
        tasksSetTogglingTaskId(task.id);
        const result = await api.toggleTaskCompletion({
          filePath: task.filePath,
          lineNumber: task.lineNumber ?? undefined,
          completed,
          title: task.title,
        });

        // Show success toast
        if (completed) {
          showSuccessToast("Tarefa concluída");
        }

        // Dispatch admin mode activation event if path override was enabled
        if (result?.adminModeExpiry) {
          const event = new CustomEvent("admin-mode-activated", {
            detail: { expiresAt: result.adminModeExpiry },
          });
          window.dispatchEvent(event);
        }

        tasksSetCompletedTaskIds((prev) => {
          const next = new Set(prev);
          if (completed) next.add(task.id);
          else next.delete(task.id);
          return next;
        });
        tasksSetSelectedTaskId(null);
        tasksSetSelectedTaskPath(null);
        tasksSetSelectedTaskTitle(null);
        tasksSetSelectedTaskHeading(null);
        tasksSetSelectedTaskContent(null);
        tasksSetSelectedTaskError(null);
        await loadDashboardSnapshot({ silent: true });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Falha ao atualizar status da tarefa.";
        tasksSetSelectedTaskError(message);
      } finally {
        tasksSetTogglingTaskId(null);
      }
    },
    [
      api,
      loadDashboardSnapshot,
      tasks.togglingTaskId,
      tasksSetTogglingTaskId,
      tasksSetCompletedTaskIds,
      tasksSetSelectedTaskId,
      tasksSetSelectedTaskPath,
      tasksSetSelectedTaskTitle,
      tasksSetSelectedTaskHeading,
      tasksSetSelectedTaskContent,
      tasksSetSelectedTaskError,
    ]
  );

  const handleTogglePinTask = useCallback(
    async (taskId: string) => {
      const isPinned = tasks.pinnedTaskIds.includes(taskId);
      const nextPinned = isPinned
        ? tasks.pinnedTaskIds.filter((id) => id !== taskId)
        : [...tasks.pinnedTaskIds, taskId];
      tasksSetPinnedTaskIds(nextPinned);
      tasksSetTaskPreferences((prev) =>
        prev ? { ...prev, pinnedTaskIds: nextPinned } : prev
      );
      if (!taskPrefsReady) return;
      try {
        await persistTaskPreferences({ pinnedTaskIds: nextPinned });
      } catch (error) {
        console.error("Failed to update pinned tasks", error);
        toast.error("Não foi possível atualizar o destaque da tarefa.");
        tasksSetPinnedTaskIds(tasks.pinnedTaskIds);
        tasksSetTaskPreferences((prev) =>
          prev ? { ...prev, pinnedTaskIds: tasks.pinnedTaskIds } : prev
        );
      }
    },
    [
      tasks.pinnedTaskIds,
      persistTaskPreferences,
      taskPrefsReady,
      tasksSetPinnedTaskIds,
      tasksSetTaskPreferences,
    ]
  );

  const handleChangeTaskPriority = useCallback(
    async (taskId: string, priority: string | null) => {
      const previous = tasks.priorityMap[taskId] ?? null;
      setOpenPriorityMenuId(null);
      tasksSetPriorityMap((prev) => {
        const next = { ...prev };
        if (priority === null) delete next[taskId];
        else next[taskId] = priority;
        return next;
      });
      tasksSetTaskPreferences((prev) => {
        if (!prev) return prev;
        const nextPriorityMap = { ...(prev.priorityMap || {}) };
        if (priority === null) delete nextPriorityMap[taskId];
        else nextPriorityMap[taskId] = priority;
        return { ...prev, priorityMap: nextPriorityMap };
      });
      if (!taskPrefsReady) return;
      try {
        await persistTaskPreferences({
          priorityMap: { [taskId]: priority ?? null },
        });
      } catch (error) {
        console.error("Failed to update task priority", error);
        toast.error("Não foi possível atualizar a prioridade agora.");
        tasksSetPriorityMap((prev) => {
          const next = { ...prev };
          if (previous === null || previous === undefined) delete next[taskId];
          else next[taskId] = previous;
          return next;
        });
        tasksSetTaskPreferences((prev) => {
          if (!prev) return prev;
          const nextPriorityMap = { ...(prev.priorityMap || {}) };
          if (previous === null || previous === undefined)
            delete nextPriorityMap[taskId];
          else nextPriorityMap[taskId] = previous;
          return { ...prev, priorityMap: nextPriorityMap };
        });
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
              <div className="mt-2">
                <EmptyFocusState
                  message="Nenhum foco definido recentemente"
                  onDefine={handleDefineFocus}
                />
                <p className="mt-2 text-xs text-zinc-500">{updatedLabel}</p>
              </div>
            )}
            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
            {activeCollection && (
              <div className="mt-3">
                <ActiveProjectBanner
                  activeCollection={activeCollection}
                  onClearProject={handleClearProjectFocus}
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FocusSummaryWidget
              focusSummary={focusSummary}
              eventsConnected={timeline.eventsConnected}
              eventsError={timeline.eventsError}
              refreshing={refreshing}
              onRefresh={() => loadDashboardSnapshot({ silent: true })}
              eventsTooltipMessage={
                timeline.eventsConnected
                  ? "Conectado ao Brain Cloud"
                  : timeline.eventsError?.message ||
                    "Tentando reconectar aos eventos"
              }
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        <div ref={layoutRef} className="flex flex-1 min-h-0 gap-4">
          <section
            className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-800/60 bg-neutral-950/80 shadow-2xl shadow-black/30 transition-all duration-300 ${
              timeline.isTimelineCollapsed
                ? "pointer-events-none opacity-0 w-0"
                : "opacity-100"
            }`}
            style={{
              flexGrow: timelineFlex,
              flexBasis: timelineFlex === 0 ? "0%" : "0",
            }}
          >
            <ConversationSection
              chatMode={timeline.chatMode}
              activeConversation={timeline.activeConversation}
              chatLoading={chatLoading}
              isThinking={isThinking}
              composerValue={timeline.composerValue}
              timelineCards={timelineCards}
              loading={loading}
              snapshot={snapshot}
              onSendMessage={handleSendMessage}
              onBackToTimeline={handleBackToTimeline}
              handleCollapseTimeline={timeline.handleCollapseTimeline}
              setComposerValue={timelineSetComposerValue}
              runtime={assistantRuntime}
              messageCount={timeline.chatMessages.length}
              providerLabel={providerLabel}
              chatMessages={timeline.chatMessages}
              streamingMessage={timeline.streamingMessage}
              thinkingMessage={timeline.thinkingMessage}
              toolEvents={timelineToolEvents}
            />
          </section>

          {timeline.isTimelineCollapsed ? (
            <div className="flex items-center">
              <button
                onClick={timeline.handleExpandTimeline}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-300 shadow-lg shadow-black/20 transition hover:border-neutral-600 hover:text-zinc-100"
                aria-label="Exibir timeline"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onMouseDown={handleResizeMouseDown}
              onTouchStart={handleResizeTouchStart}
              className="relative my-2 hidden w-1 cursor-col-resize rounded-full bg-neutral-800 transition hover:bg-neutral-600 xl:block"
            >
              <span className="absolute inset-y-0 -inset-x-1" />
            </div>
          )}

          <aside
            className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-800/60 bg-neutral-950/80 shadow-2xl shadow-black/30"
            style={{ flexGrow: executionFlex, flexBasis: 0 }}
          >
            <div className="border-b border-neutral-800/60 px-6 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Painel Operacional
                  </p>
                  <h3 className="text-lg font-semibold text-white">
                    {activeUtilityMeta.label}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ui.activeUtility === "tasks" && (
                    <button className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:bg-neutral-800">
                      <ListTodo className="h-3 w-3" />
                      Nova tarefa
                    </button>
                  )}
                  {ui.activeUtility === "search" && (
                    <div className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-zinc-100">
                      <SearchIcon className="h-4 w-4 text-zinc-400" />
                      <input
                        ref={searchInputRef}
                        value={tasks.searchTerm}
                        onChange={(event) =>
                          tasksSetSearchTerm(event.target.value)
                        }
                        placeholder="Buscar no snapshot..."
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
              {ui.activeUtility !== "search" &&
                ui.activeUtility !== "tasks" && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {ui.activeUtility === "inbox"
                      ? "Notas brutas e capturas rápidas vindas do Segundo Cérebro."
                      : ui.activeUtility === "dailyNotes"
                      ? "Notas capturadas automaticamente e curadoria diária."
                      : ui.activeUtility === "workflows"
                      ? "Execute e monitore workflows automáticos para Daily Review, Weekly Review, Sync e Embeddings."
                      : ui.activeUtility === "agents"
                      ? "Status dos agentes autônomos e execuções recentes."
                      : ui.activeUtility === "projects"
                      ? "Organize e ative projetos do Vectal em um painel dedicado."
                      : ui.activeUtility === "chatHistory"
                      ? "Histórico resumido das conversas recentes com o Cognito."
                      : ui.activeUtility === "knowledgeGraph"
                      ? "Visualização do grafo de conhecimento do seu Segundo Cérebro."
                      : ui.activeUtility === "mcpTools"
                      ? "Ferramentas MCP disponíveis para o contexto atual."
                      : ui.activeUtility === "shortcuts"
                      ? "Atalhos para acelerar sua navegação."
                      : null}
                  </p>
                )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {renderUtilityContent()}
            </div>
          </aside>
        </div>

        <aside className="flex w-16 flex-col items-center gap-2 rounded-2xl border border-neutral-800/60 bg-neutral-950/80 py-3 shadow-2xl shadow-black/30">
          {utilityButtons.map((button) => {
            const Icon = button.icon;
            const isActive = button.id === ui.activeUtility;
            return (
              <button
                key={button.id}
                onClick={() => handleUtilitySelect(button.id)}
                className={`flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-[9px] font-medium uppercase tracking-wider transition ${
                  isActive
                    ? "bg-neutral-800 text-emerald-400"
                    : "text-zinc-500 hover:bg-neutral-900/50 hover:text-zinc-300"
                }`}
                title={button.label}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-emerald-400" : "text-zinc-400"
                  }`}
                />
                <span className="leading-none">{button.label}</span>
              </button>
            );
          })}
          <div className="mt-auto flex w-full flex-col items-center gap-1 pt-2">
            <button
              type="button"
              onClick={() => handleUtilitySelect("shortcuts")}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:text-emerald-200 ${
                ui.activeUtility === "shortcuts"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : ""
              }`}
              title="Atalhos"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-semibold text-zinc-400">
              {APP_VERSION_LABEL}
            </span>
          </div>
        </aside>
      </div>

      {tasks.selectedTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            tasksSetSelectedTaskId(null);
            tasksSetSelectedTaskPath(null);
            tasksSetSelectedTaskTitle(null);
            tasksSetSelectedTaskHeading(null);
            tasksSetSelectedTaskContent(null);
            tasksSetSelectedTaskError(null);
          }}
        >
          <div
            className="relative mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-4">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  {tasks.selectedTaskTitle || "Detalhes da Tarefa"}
                </h2>
                {tasks.selectedTaskHeading && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {tasks.selectedTaskHeading}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  tasksSetSelectedTaskId(null);
                  tasksSetSelectedTaskPath(null);
                  tasksSetSelectedTaskTitle(null);
                  tasksSetSelectedTaskHeading(null);
                  tasksSetSelectedTaskContent(null);
                  tasksSetSelectedTaskError(null);
                }}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-800 text-zinc-400 transition hover:border-neutral-600 hover:bg-neutral-900 hover:text-zinc-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {tasks.selectedTaskLoading ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  Carregando nota...
                </div>
              ) : tasks.selectedTaskError ? (
                <p className="text-sm text-rose-400">
                  {tasks.selectedTaskError}
                </p>
              ) : tasks.selectedTaskPath && tasks.selectedTaskContent ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children, ...props }) => (
                        <p
                          className="mb-4 text-base leading-relaxed text-zinc-200"
                          {...props}
                        >
                          {children}
                        </p>
                      ),
                      h1: ({ ...props }) => (
                        <h1
                          className="mb-4 mt-6 text-2xl font-bold text-zinc-50"
                          {...props}
                        />
                      ),
                      h2: ({ ...props }) => (
                        <h2
                          className="mb-3 mt-5 text-xl font-semibold text-zinc-50"
                          {...props}
                        />
                      ),
                      h3: ({ ...props }) => (
                        <h3
                          className="mb-2 mt-4 text-lg font-semibold text-zinc-100"
                          {...props}
                        />
                      ),
                      ul: ({ ...props }) => (
                        <ul
                          className="mb-4 ml-6 list-disc space-y-2 text-zinc-200"
                          {...props}
                        />
                      ),
                      ol: ({ ...props }) => (
                        <ol
                          className="mb-4 ml-6 list-decimal space-y-2 text-zinc-200"
                          {...props}
                        />
                      ),
                      li: ({ ...props }) => (
                        <li className="leading-relaxed" {...props} />
                      ),
                      code: (
                        componentProps: React.ComponentPropsWithoutRef<"code">
                      ) => {
                        const { children, className, ...props } =
                          componentProps;
                        const isBlock = className?.includes("language-");
                        if (isBlock) {
                          return (
                            <pre className="mb-4 overflow-x-auto rounded-lg border border-neutral-700 bg-neutral-900 p-4">
                              <code
                                className="text-sm text-emerald-300"
                                {...props}
                              >
                                {children}
                              </code>
                            </pre>
                          );
                        }
                        return (
                          <code
                            className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-sm text-emerald-300"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      blockquote: ({ ...props }) => (
                        <blockquote
                          className="mb-4 border-l-4 border-neutral-700 pl-4 italic text-zinc-300"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {tasks.selectedTaskContent}
                  </ReactMarkdown>
                </div>
              ) : tasks.selectedTaskPath ? (
                <p className="text-sm text-zinc-500">Nota vinculada vazia.</p>
              ) : (
                <p className="text-sm text-zinc-500">
                  Esta tarefa não possui nota vinculada no Segundo Cérebro.
                </p>
              )}
            </div>
            {tasks.selectedTaskPath && (
              <div className="border-t border-neutral-800 px-6 py-3">
                <p className="text-xs text-zinc-500">
                  Nota:{" "}
                  <span className="font-mono">{tasks.selectedTaskPath}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {completedModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur"
          onClick={handleCloseCompletedModal}
        >
          <div
            className="relative mx-4 w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                Tarefas concluídas
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    loadCompletedTasks(true);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${
                      completedLoading ? "animate-spin" : ""
                    }`}
                  />
                  Atualizar
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCloseCompletedModal();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-zinc-400 transition hover:border-neutral-600 hover:bg-neutral-900 hover:text-zinc-100"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {completedLoading ? (
                <div className="flex h-32 items-center justify-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
                  Buscando tarefas concluídas...
                </div>
              ) : completedTasks.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-sm text-zinc-500">
                  Nenhuma tarefa concluída encontrada.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-neutral-800">
                  <div className="grid grid-cols-[2fr_1fr_1fr] bg-neutral-900/80 px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-500">
                    <span>Tarefa</span>
                    <span>Projeto</span>
                    <span>Concluída</span>
                  </div>
                  <div className="divide-y divide-neutral-800 bg-neutral-950/80">
                    {completedTasks.map((task) => {
                      const taskRecord = task as CompletedTask &
                        Record<string, unknown>;
                      const completionDate =
                        task.completedAt ||
                        taskRecord.completed_at ||
                        taskRecord.completed_at_ts;
                      const completionLabel = completionDate
                        ? new Date(completionDate).toLocaleString()
                        : "—";
                      return (
                        <div
                          key={`${task.id || task.title}-${completionLabel}`}
                          className="grid grid-cols-[2fr_1fr_1fr] items-center px-4 py-2 text-sm text-zinc-200"
                        >
                          <span className="truncate">
                            {task.title || "Sem título"}
                          </span>
                          <span className="truncate text-xs text-zinc-500">
                            {task.project || "—"}
                          </span>
                          <span className="truncate text-xs text-zinc-400">
                            {completionLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-neutral-800 px-6 py-3 text-xs text-zinc-500">
              {completedTasks.length} tarefas armazenadas no histórico recente.
            </div>
          </div>
        </div>
      )}

      {contextModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur"
          onClick={handleCloseContextModal}
        >
          <div
            className="relative mx-4 w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                User context padrão
              </h3>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCloseContextModal();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-zinc-400 transition hover:border-neutral-600 hover:bg-neutral-900 hover:text-zinc-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Work description
                </label>
                <textarea
                  value={tasks.taskContextDraft.workDescription}
                  onChange={(event) =>
                    tasksSetTaskContextDraft((prev) => ({
                      ...prev,
                      workDescription: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-zinc-200 focus:border-neutral-600 focus:outline-none"
                  rows={3}
                  placeholder="Descreva rapidamente o escopo do trabalho"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Short term focus
                </label>
                <textarea
                  value={tasks.taskContextDraft.shortTermFocus}
                  onChange={(event) =>
                    tasksSetTaskContextDraft((prev) => ({
                      ...prev,
                      shortTermFocus: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-zinc-200 focus:border-neutral-600 focus:outline-none"
                  rows={3}
                  placeholder="Quais são os objetivos imediatos?"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Long term goals
                </label>
                <textarea
                  value={tasks.taskContextDraft.longTermGoals}
                  onChange={(event) =>
                    tasksSetTaskContextDraft((prev) => ({
                      ...prev,
                      longTermGoals: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-zinc-200 focus:border-neutral-600 focus:outline-none"
                  rows={3}
                  placeholder="Objetivos estratégicos de longo prazo"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Other context
                </label>
                <textarea
                  value={tasks.taskContextDraft.otherContext}
                  onChange={(event) =>
                    tasksSetTaskContextDraft((prev) => ({
                      ...prev,
                      otherContext: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-zinc-200 focus:border-neutral-600 focus:outline-none"
                  rows={3}
                  placeholder="Informações adicionais, linguagem preferida, etc."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-6 py-3">
              <button
                type="button"
                onClick={handleCloseContextModal}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleContextSave}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition hover:border-emerald-500/60 hover:text-emerald-100"
              >
                Salvar contexto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integrated Chat Widget */}
      <ChatWidget
        className="fixed bottom-0 right-6 z-50"
        context={activeModelContext}
        providerLabel={providerLabel}
      />
    </div>
  );
};

export default BusinessIntelligenceHub;

type HubTimelineCardProps = {
  card: TimelineCard;
};

const _HubTimelineCard: React.FC<HubTimelineCardProps> = ({ card }) => {
  if (card.type === "message") {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-lg shadow-black/20 transition hover:border-neutral-600 hover:shadow-black/10 animate-[fadeInUp_0.3s_ease-out]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-200">{card.title}</p>
            <p className="mt-3 whitespace-pre-line text-sm text-zinc-300">
              {card.body}
            </p>
          </div>
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            {card.timestamp}
          </span>
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

  if (card.type === "insight") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg shadow-emerald-500/10 transition hover:border-emerald-400/50 animate-[fadeInUp_0.3s_ease-out]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-emerald-200">
              Insight IA
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {card.title}
            </h3>
            <p className="mt-3 text-sm text-emerald-100/90">{card.body}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-100/80">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-emerald-200/40 px-3 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs uppercase tracking-wide text-emerald-200/70">
            {card.timestamp}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-emerald-100/80">
          <span>{card.impact}</span>
          <span>Confiança {(card.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    );
  }

  if (card.type === "note") {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-lg shadow-black/15 transition hover:border-neutral-600 hover:shadow-black/10 animate-[fadeInUp_0.3s_ease-out]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Nota criada
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {card.title}
            </h3>
            <p className="mt-3 text-sm text-zinc-300">{card.snippet}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
              {card.related.map((item) => (
                <button
                  key={item}
                  className="rounded-full border border-neutral-800 px-3 py-1 transition hover:border-neutral-600"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            {card.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5 shadow-lg shadow-sky-500/10 transition hover:border-sky-400/40 animate-[fadeInUp_0.3s_ease-out]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-sky-200">
            Agente
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {card.title}
          </h3>
          <p className="mt-3 text-sm text-sky-100/90">{card.description}</p>
          {card.nextRun && (
            <p className="mt-3 text-xs uppercase tracking-wide text-sky-200/80">
              {card.nextRun}
            </p>
          )}
        </div>
        <span className="text-xs uppercase tracking-wide text-sky-200/80">
          {card.timestamp}
        </span>
      </div>
    </div>
  );
};
