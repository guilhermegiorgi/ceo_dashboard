import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FilePlus2,
  Flag,
  Link2,
  Loader2,
  Mic,
  Play,
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
  SlidersHorizontal,
  Info,
  UserCircle,
  CheckCircle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  DashboardSnapshot,
  DashboardCollection,
  AgentRun,
  InboxNote,
  CompletedTask,
  TaskPreferences,
  Conversation,
  ChatMessage,
  ConversationModelConfig,
} from "../services/apiClient";
import { useAPI } from "../hooks/useAPI";
import KnowledgeGraphVisualizer from "./KnowledgeGraphVisualizer";
import ConversationView from "./ConversationView";

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const APP_VERSION_LABEL = APP_VERSION.toUpperCase().startsWith("V")
  ? APP_VERSION.toUpperCase()
  : `V${APP_VERSION}`;

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

type ConversationModelOption = {
  id: string;
  modelId: string;
  displayName: string;
  providerId: string;
  providerName: string;
  providerDisplayName: string;
  isDefault: boolean;
  supportsStreaming?: boolean;
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

const FALLBACK_TIMELINE: TimelineCard[] = [
  {
    id: "card-1",
    type: "message",
    author: "assistant",
    title: "Bom dia! Aqui está o foco do dia:",
    body: "• Validar proposta de automação IA com a Cooperativa Verde.\n• Finalizar roteiro do piloto multi-tenant.\n• Revisar 4 notas marcadas como “pending review”.",
    timestamp: "08:00",
    actions: [
      { label: "Avaliar notas", icon: <Link2 className="h-4 w-4" /> },
      { label: "Gerar resumo diário", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    id: "card-2",
    type: "insight",
    title: "Insight IA: onboarding Agro SaaS",
    body: "Padrões de reuniões + notas indicam oportunidade de oferecer onboarding express para cooperativas (ticket médio R$ 18k).",
    impact: "Potencial +R$ 90k / trimestre",
    confidence: 0.82,
    tags: ["#estratégia", "#agronegócio", "#produto"],
    timestamp: "Ontem • 19:42",
  },
  {
    id: "card-3",
    type: "note",
    title: "Transcrição – Reunião NK Insights",
    snippet:
      "Squads escolhidos para agentes autônomos: suporte, BI e agricultura digital. Integração inicial com dashboards existentes...",
    related: ["Roadmap IA NK", "Hypersprint #03"],
    timestamp: "Ontem • 17:22",
  },
  {
    id: "card-4",
    type: "agent",
    title: "Agente Daily Focus concluído",
    status: "completed",
    description:
      "Resumo diário gerado das notas 09/10 + tarefas atrasadas. 4 insights sugeridos.",
    nextRun: "Próxima execução às 07:00",
    timestamp: "Hoje • 07:01",
  },
  {
    id: "card-5",
    type: "message",
    author: "user",
    title: "Pergunta",
    body: "Quais riscos estratégicos preciso revisar esta semana?",
    timestamp: "Ontem • 21:13",
    actions: [
      { label: "Ver resposta", icon: <ChevronRight className="h-4 w-4" /> },
    ],
  },
];

const FALLBACK_TASKS: Task[] = [];

const FALLBACK_PINNED_INSIGHTS = [
  {
    id: "pin-1",
    title: "Playbook onboarding IA em 7 dias",
    description:
      "Sequência de passos para onboarding express em cooperativas. Atualizado ontem.",
    source: "Insight IA • Alta prioridade",
  },
  {
    id: "pin-2",
    title: "Mapa de decisões críticas NK Insights",
    description:
      "Top 5 decisões que dependem de dados atualizados nas próximas duas semanas.",
    source: "Decision Journal",
  },
];

const FALLBACK_FOCUS_SUMMARY = [
  { label: "Projetos ativos", value: 5 },
  { label: "Insights novos", value: 8 },
  { label: "Tarefas críticas", value: 3 },
];

const FALLBACK_AGENT_CARDS = [
  {
    id: "agent-1",
    name: "Daily Focus",
    status: "Executado",
    time: "07:01",
    icon: <Sparkles className="h-4 w-4 text-emerald-300" />,
  },
  {
    id: "agent-2",
    name: "Linker Insights",
    status: "Rodando",
    time: "agora",
    icon: <Loader2 className="h-4 w-4 text-sky-300 animate-spin" />,
  },
  {
    id: "agent-3",
    name: "Weekly Digest",
    status: "Agendado",
    time: "Sáb • 08:00",
    icon: <Timer className="h-4 w-4 text-zinc-300" />,
  },
];

const FALLBACK_CHAT_THREADS: ChatThread[] = [
  {
    id: "chat-1",
    title: "Planejamento Weekly Review",
    summary:
      "Checklist da weekly review com insights das notas e tarefas críticas.",
    updatedAt: new Date().toISOString(),
    messageCount: 18,
    tags: ["ritual", "weekly"],
    pinned: true,
  },
  {
    id: "chat-2",
    title: "Estratégia Agro SaaS",
    summary:
      "Discussão sobre hipóteses de crescimento e playbook de onboarding.",
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    messageCount: 24,
    tags: ["agro", "produto"],
  },
  {
    id: "chat-3",
    title: "Roadmap NK Insights",
    summary:
      "Brainstorm das próximas entregas e dependências com squads parceiros.",
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    messageCount: 12,
    tags: ["roadmap", "parcerias"],
  },
];

type AgentCardData = {
  id: string;
  name: string;
  status: string;
  time: string;
  icon: React.ReactNode;
};

type UtilityView =
  | "tasks"
  | "inbox"
  | "dailyNotes"
  | "workflows"
  | "search"
  | "agents"
  | "projects"
  | "chatHistory"
  | "knowledgeGraph"
  | "mcpTools"
  | "shortcuts";

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
  const api = useAPI();
  const location = useLocation();
  const navigate = useNavigate();
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [activeUtility, setActiveUtility] = useState<UtilityView>("tasks");
  const [composerValue, setComposerValue] = useState("");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [collections, setCollections] = useState<DashboardCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [inboxNotes, setInboxNotes] = useState<InboxNote[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [expandedInboxFrontmatter, setExpandedInboxFrontmatter] = useState<
    string | null
  >(null);
  const [expandedInboxPath, setExpandedInboxPath] = useState<string | null>(
    null
  );
  const [expandedInboxContent, setExpandedInboxContent] = useState<
    string | null
  >(null);
  const [expandedInboxLoading, setExpandedInboxLoading] = useState(false);
  const [expandedInboxError, setExpandedInboxError] = useState<string | null>(
    null
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskPath, setSelectedTaskPath] = useState<string | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string | null>(
    null
  );
  const [selectedTaskHeading, setSelectedTaskHeading] = useState<string | null>(
    null
  );
  const [selectedTaskContent, setSelectedTaskContent] = useState<string | null>(
    null
  );
  const [selectedTaskLoading, setSelectedTaskLoading] = useState(false);
  const [selectedTaskError, setSelectedTaskError] = useState<string | null>(
    null
  );
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    () => new Set()
  );
  const [, setTaskPreferences] = useState<TaskPreferences | null>(null);

  // Chat/Conversation states
  const [chatMode, setChatMode] = useState<"timeline" | "conversation">(
    "timeline"
  );
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [modelOptions, setModelOptions] = useState<ConversationModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelUpdating, setModelUpdating] = useState(false);
  const [conversationModelConfig, setConversationModelConfig] =
    useState<ConversationModelConfig | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [taskPrefsReady, setTaskPrefsReady] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<"list" | "kanban">("list");
  const [taskSortBy, setTaskSortBy] = useState<
    "natural" | "due" | "priority" | "project"
  >("natural");
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const [priorityMap, setPriorityMap] = useState<Record<string, string>>({});
  const [boardOrder, setBoardOrder] = useState<Record<string, string[]>>({});
  const [openPriorityMenuId, setOpenPriorityMenuId] = useState<string | null>(
    null
  );
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [taskContextDraft, setTaskContextDraft] = useState({
    workDescription: "",
    shortTermFocus: "",
    longTermGoals: "",
    otherContext: "",
  });
  const [aiCleanupLoading, setAiCleanupLoading] = useState(false);
  const [boardDragState, setBoardDragState] = useState<{
    taskId: string;
    fromColumn: string;
  } | null>(null);
  
  // ✨ Brain Cloud Semantic Insights
  const [semanticInsights, setSemanticInsights] = useState<any[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [lastSemanticQuery, setLastSemanticQuery] = useState<string | null>(null);

  const applyTaskPreferences = useCallback((prefs: TaskPreferences) => {
    if (!prefs) return;
    setTaskPreferences(prefs);
    const nextView =
      prefs.viewMode === "kanban" || prefs.viewMode === "list"
        ? prefs.viewMode
        : "list";
    setTaskViewMode(nextView);
    const allowedSorts = new Set(["natural", "due", "priority", "project"]);
    setTaskSortBy(
      prefs.sortBy && allowedSorts.has(prefs.sortBy)
        ? (prefs.sortBy as "natural" | "due" | "priority" | "project")
        : "natural"
    );
    setPinnedTaskIds(
      Array.isArray(prefs.pinnedTaskIds) ? prefs.pinnedTaskIds : []
    );
    setPriorityMap(prefs.priorityMap ? { ...prefs.priorityMap } : {});

    const baseBoardOrder: Record<string, string[]> = {
      overdue: [],
      today: [],
      upcoming: [],
    };
    if (prefs.boardOrder) {
      Object.entries(prefs.boardOrder).forEach(([column, ids]) => {
        baseBoardOrder[column] = Array.isArray(ids)
          ? ids.map((id) => String(id))
          : [];
      });
    }
    setBoardOrder(baseBoardOrder);

    const template = prefs.contextTemplate || {};
    setTaskContextDraft({
      workDescription: template.workDescription || "",
      shortTermFocus: template.shortTermFocus || "",
      longTermGoals: template.longTermGoals || "",
      otherContext: template.otherContext || "",
    });
  }, []);

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
    return FALLBACK_TASKS;
  }, [snapshot]);

  // ✨ Brain Cloud: Buscar insights semânticos baseados no contexto
  const fetchSemanticInsights = useCallback(async () => {
    if (semanticLoading) return;
    
    // Construir query baseada no contexto atual
    const contextParts = [];
    
    // Adicionar foco semanal se existir
    if (snapshot?.data?.focus?.weekly_focus?.title) {
      contextParts.push(snapshot.data.focus.weekly_focus.title);
    }
    
    // Adicionar tarefas críticas
    if (tasksList.length > 0) {
      const criticalTasks = tasksList.slice(0, 3).map(t => t.title).join(' ');
      contextParts.push(criticalTasks);
    }
    
    // Adicionar metadados de projetos
    const activeProjects = collections?.filter(c => c.active).slice(0, 2).map(c => c.name).join(' ');
    if (activeProjects) {
      contextParts.push(activeProjects);
    }
    
    const query = contextParts.join(' ');
    if (!query || query === lastSemanticQuery) return;
    
    try {
      setSemanticLoading(true);
      const response = await api.semanticSearch(query, 3);
      setSemanticInsights(response.results || []);
      setLastSemanticQuery(query);
    } catch (error) {
      console.error('Erro ao buscar insights semânticos:', error);
      setSemanticInsights([]);
    } finally {
      setSemanticLoading(false);
    }
  }, [snapshot, tasksList, collections, semanticLoading, lastSemanticQuery, api]);

  // Buscar insights quando o contexto mudar
  useEffect(() => {
    if (snapshot && tasksList.length > 0) {
      const timer = setTimeout(() => {
        fetchSemanticInsights();
      }, 1000); // Delay para evitar muitas requisições
      
      return () => clearTimeout(timer);
    }
  }, [snapshot, tasksList, fetchSemanticInsights]);

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
      applyTaskPreferences(updated);
    },
    [api, applyTaskPreferences, taskPrefsReady]
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
  const [panelRatio, setPanelRatio] = useState(() => {
    if (typeof window === "undefined") return 0.58;
    const stored = window.localStorage.getItem("ggai.layout.panelRatio");
    const parsed = stored ? parseFloat(stored) : NaN;
    if (Number.isFinite(parsed) && parsed >= 0.3 && parsed <= 0.75) {
      return parsed;
    }
    return 0.58;
  });
  const collectionId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("collection");
  }, [location.search]);
  const quickAction = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("action");
  }, [location.search]);
  const viewMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("view");
  }, [location.search]);

  const setViewParam = useCallback(
    (view: string | null) => {
      const params = new URLSearchParams(location.search);
      if (view) {
        params.set("view", view);
      } else {
        params.delete("view");
      }
      const searchValue = params.toString();
      navigate(`${location.pathname}${searchValue ? `?${searchValue}` : ""}`, {
        replace: true,
      });
    },
    [location.pathname, location.search, navigate]
  );

  const handleUtilitySelect = useCallback(
    (utility: UtilityView) => {
      setActiveUtility(utility);
      if (utility === "inbox") {
        setViewParam("inbox");
      } else if (utility === "dailyNotes") {
        setViewParam("daily");
      } else {
        setViewParam(null);
      }
    },
    [setViewParam]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prefs = await api.getTaskPreferences();
        if (!cancelled && prefs) {
          applyTaskPreferences(prefs);
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
  }, [api, applyTaskPreferences]);

  useEffect(() => {
    if (!viewMode) return;
    if (viewMode === "inbox") {
      setActiveUtility("inbox");
    } else if (viewMode === "daily") {
      setActiveUtility("dailyNotes");
    } else if (viewMode === "tasks") {
      setActiveUtility("tasks");
    }
  }, [viewMode]);

  const updatePanelRatio = useCallback((clientX: number) => {
    const container = layoutRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const nextRatio = relativeX / rect.width;
    const clamped = Math.min(0.75, Math.max(0.3, nextRatio));
    setPanelRatio(clamped);
  }, []);

  const handleResizeStart = useCallback(
    (clientX: number) => {
      if (isTimelineCollapsed) {
        setIsTimelineCollapsed(false);
      }
      isResizingRef.current = true;
      updatePanelRatio(clientX);
    },
    [isTimelineCollapsed, updatePanelRatio]
  );

  const handleResizeMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      handleResizeStart(event.clientX);
    },
    [handleResizeStart]
  );

  const handleResizeTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return;
      handleResizeStart(event.touches[0].clientX);
    },
    [handleResizeStart]
  );
  const handleCollapseTimeline = useCallback(
    () => setIsTimelineCollapsed(true),
    []
  );
  const handleExpandTimeline = useCallback(
    () => setIsTimelineCollapsed(false),
    []
  );

  const initializeConversationModels = useCallback(
    async (conversationId: string) => {
      setModelOptions([]);
      setConversationModelConfig(null);
      setSelectedModelId(null);
      setModelsLoading(true);

      try {
        let [modelsResponse, configResponse] = await Promise.all([
          api.getAvailableModels(),
          api.getConversationModel(conversationId),
        ]);

        let mappedModels: ConversationModelOption[] =
          (modelsResponse.models || []).map((model) => ({
            id: model.id,
            modelId: model.modelId,
            displayName: model.displayName,
            providerId: model.providerId || "",
            providerName: model.providerName || "",
            providerDisplayName:
              model.providerDisplayName || model.providerName || "",
            isDefault: Boolean(model.isDefault),
            supportsStreaming: model.supportsStreaming,
          })) || [];

        if (mappedModels.length === 0) {
          try {
            const providerList = await api.getAIProviders();
            const providers = providerList.providers || [];
            if (providers.length > 0) {
              await Promise.all(
                providers.map((provider) =>
                  api
                    .syncProviderModels(provider.id)
                    .catch((error) => {
                      console.error(
                        `Error syncing models for provider ${provider.displayName}:`,
                        error
                      );
                      return null;
                    })
                )
              );

              modelsResponse = await api.getAvailableModels();
              mappedModels = (modelsResponse.models || []).map((model) => ({
                id: model.id,
                modelId: model.modelId,
                displayName: model.displayName,
                providerId: model.providerId || "",
                providerName: model.providerName || "",
                providerDisplayName:
                  model.providerDisplayName || model.providerName || "",
                isDefault: Boolean(model.isDefault),
                supportsStreaming: model.supportsStreaming,
              }));
            }
          } catch (syncError) {
            console.error("Error syncing models automatically:", syncError);
          }
        }

        setModelOptions(mappedModels);

        let finalConfig = configResponse;

        if (!finalConfig && mappedModels.length > 0) {
          const defaultOption =
            mappedModels.find((option) => option.isDefault) ||
            mappedModels[0];

          try {
            finalConfig = await api.setConversationModel(
              conversationId,
              defaultOption.id
            );
          } catch (error) {
            console.error("Error setting default model:", error);
            toast.error("Falha ao definir o modelo padrão da conversa");
          }
        }

        if (finalConfig) {
          setConversationModelConfig(finalConfig);
          setSelectedModelId(finalConfig.modelId);
        } else {
          setConversationModelConfig(null);
          setSelectedModelId(null);
        }

        if (mappedModels.length === 0) {
          toast.error(
            "Nenhum modelo disponível. Configure um provedor de IA nas configurações."
          );
        }

        return finalConfig ?? null;
      } catch (error) {
        console.error("Error loading conversation models:", error);
        toast.error("Não foi possível carregar os modelos de IA");
        setConversationModelConfig(null);
        setSelectedModelId(null);
        setModelOptions([]);
        return null;
      } finally {
        setModelsLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    if (
      chatMode === "conversation" &&
      activeConversation?.id &&
      !modelsLoading &&
      modelOptions.length === 0
    ) {
      initializeConversationModels(activeConversation.id);
    }
  }, [
    activeConversation?.id,
    chatMode,
    initializeConversationModels,
    modelOptions.length,
    modelsLoading,
  ]);

  // Chat/Conversation handlers
  const handleStartChat = useCallback(
    async (initialMessage: string) => {
      try {
        setChatLoading(true);

        // Get current context (project if in collection view)
        const params = new URLSearchParams(location.search);
        const collectionId = params.get("collection");

        // Create new conversation with context
        const conversation = await api.createConversation({
          contextType: collectionId ? "project" : "global",
          contextProjectId: collectionId || undefined,
        });

        setActiveConversation(conversation);
        setChatMessages([]);
        setStreamingMessage("");
        setChatMode("conversation");

        await initializeConversationModels(conversation.id);

        // Send initial message
        if (initialMessage.trim()) {
          await handleSendMessage(initialMessage);
        }
      } catch (error) {
        console.error("Error starting chat:", error);
        toast.error("Erro ao iniciar conversa");
      } finally {
        setChatLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, initializeConversationModels, location.search]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();

      if (!activeConversation || !trimmedContent) return;

      if (!selectedModelId) {
        toast.error(
          "Selecione um modelo de IA antes de enviar mensagens."
        );
        return;
      }

      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: trimmedContent,
        createdAt: new Date().toISOString(),
      };

      try {
        setChatLoading(true);
        setChatMessages((prev) => [...prev, tempMessage]);

        const savedMessage = await api.addMessage(activeConversation.id, {
          role: "user",
          content: trimmedContent,
        });

        setChatMessages((prev) =>
          prev.map((message) =>
            message.id === tempMessage.id ? savedMessage : message
          )
        );

        // 🔗 Salvar conversa no Brain Cloud (só se tiver conteúdo)
        try {
          const conversationContent = [...chatMessages, savedMessage].map(m => m.content).join(' ');
          if (conversationContent && conversationContent.trim()) {
            await api.saveConversation(
              activeConversation.id,
              [...chatMessages, savedMessage],
              {
                source: 'claude',
                modelId: selectedModelId,
                timestamp: new Date().toISOString()
              }
            );
          }
        } catch (brainError) {
          console.warn("Erro ao salvar conversation no Brain Cloud:", brainError);
          // Não bloqueia a conversa se o Brain Cloud falhar
        }

        setStreamingMessage("Gerando resposta...");

        // 🔍 Buscar contexto relevante no Brain Cloud
        let contextData = null;
        try {
          contextData = await api.semanticSearch(trimmedContent, 3);
        } catch (searchError) {
          console.warn("Erro na busca semântica:", searchError);
        }

        // 🔥 USAR STREAMING REAL COM MCP TOOLS
        let streamedContent = "";
        let thinkingContent = "";
        let isInThinkingPhase = false;
        
        await api.chatStream(
          [
            { role: "system", content: "Você é um assistente IA com acesso às ferramentas MCP. Sempre use as ferramentas quando disponíveis para ajudar o usuário. Quando estiver pensando, compartilhe seu processo de raciocínio para que o usuário possa acompanhar seu desenvolvimento." },
            ...chatMessages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: "user", content: trimmedContent }
          ],
          activeConversation.id,
          (chunk) => {
            // Handle different chunk types
            if (typeof chunk === 'object' && chunk.thinking) {
              // Chunk is thinking content
              thinkingContent += chunk.content;
              setThinkingMessage(thinkingContent);
              setIsThinking(true);
            } else if (typeof chunk === 'string') {
              // Chunk is plain string - apply detection logic
              if (chunk.includes("<thinking") || chunk.includes("Pensando:") || chunk.includes("Vou analisar") || chunk.includes("🧠")) {
                if (!isInThinkingPhase) {
                  isInThinkingPhase = true;
                  setIsThinking(true);
                  thinkingContent = "";
                }
              }
              
              if (chunk.includes("📝 **RESPOSTA FINAL:") || chunk.includes("Conclusão:") || chunk.includes("Resposta:")) {
                if (isInThinkingPhase) {
                  isInThinkingPhase = false;
                  setIsThinking(false);
                  // Don't clear thinking message - keep it for viewing
                }
              }
              
              // Processa chunk
              if (isInThinkingPhase) {
                thinkingContent += chunk;
                setThinkingMessage(thinkingContent);
              } else {
                streamedContent += chunk;
                setStreamingMessage(prev => prev + chunk);
              }
            } else {
              // Check for additional reasoning content
              if (chunk.includes("🧠") || chunk.includes("Analisando:") || chunk.includes("Vou considerar:") || 
                  chunk.includes("Vou verificar:") || chunk.includes("Preciso analisar:") || 
                  chunk.includes("Vou pesquisar:") || chunk.includes("Vou usar o")) {
                thinkingContent += chunk + "\n";
                setThinkingMessage(thinkingContent);
                setIsThinking(true);
              } else {
                streamedContent += chunk;
                setStreamingMessage(prev => prev + chunk);
              }
            }
          },
          (error) => {
            console.error("Streaming error:", error);
            toast.error("Erro no streaming da resposta");
            setChatMessages((prev) =>
              prev.filter((message) => message.id !== tempMessage.id)
            );
            setIsThinking(false);
            setThinkingMessage("");
          },
          async () => {
            // Salvar thinking no histórico se tiver conteúdo
            if (thinkingContent.trim()) {
              const thinkingMessage: ChatMessage = {
                id: `thinking-${Date.now()}`,
                role: "assistant",
                content: `🧠 **PROCESSO DE RACIOCÍNIO:**\n\n${thinkingContent.trim()}`,
                createdAt: new Date().toISOString(),
              };
              
              try {
                const savedThinking = await api.addMessage(activeConversation.id, {
                  role: "assistant", 
                  content: thinkingMessage.content
                });
                
                setChatMessages((prev) => [...prev, savedThinking]);
              } catch (saveError) {
                console.error("Error saving thinking to history:", saveError);
              }
            }
            
            // Marcar thinking como complete mas não limpar ainda (deixa usuário controlar)
            if (isInThinkingPhase) {
              setIsThinking(false);
            }
            
            // Streaming completo - usar conteúdo acumulado local
            if (streamedContent.trim()) {
              const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: streamedContent,
                createdAt: new Date().toISOString(),
              };
              
              try {
                const savedResponse = await api.addMessage(activeConversation.id, {
                  role: "assistant",
                  content: streamedContent,
                });
                
                setChatMessages((prev) => [...prev, savedResponse]);
                
                // 🔗 Salvar conversa completa no Brain Cloud (com tratamento de erro)
                try {
                  await api.saveConversation(
                    activeConversation.id,
                    [...chatMessages, tempMessage, savedResponse],
                    {
                      source: 'claude',
                      modelId: selectedModelId,
                      timestamp: new Date().toISOString()
                    }
                  );
                } catch (brainError) {
                  console.warn("Erro ao salvar conversation no Brain Cloud (continuando normalmente):", brainError);
                  // Não falha a conversa se o Brain Cloud salvar falhar
                }
              } catch (saveError) {
                console.error("Error saving streaming response:", saveError);
                // Adicionar mensagem local mesmo se falhar save
                setChatMessages((prev) => [...prev, assistantMessage]);
              }
            } else {
              console.log("Skipping save - empty streaming response");
            }
            
            // Limpar streaming state
            setStreamingMessage("");
          },
          selectedModelId
        );
      } catch (error) {
        console.error("Error sending message:", error);
        toast.error("Erro ao processar a resposta da IA");
        setChatMessages((prev) =>
          prev.filter((message) => message.id !== tempMessage.id)
        );
        setStreamingMessage("");
      } finally {
        setChatLoading(false);
      }
    },
    [activeConversation, api, selectedModelId, chatMessages]
  );

  const handleBackToTimeline = useCallback(() => {
    setChatMode("timeline");
    setActiveConversation(null);
    setChatMessages([]);
    setStreamingMessage("");
    setComposerValue("");
    setModelOptions([]);
    setConversationModelConfig(null);
    setSelectedModelId(null);
    setModelsLoading(false);
    setModelUpdating(false);
  }, []);

  const handleModelChange = useCallback(
    async (modelId: string) => {
      if (!activeConversation || !modelId) return;

      try {
        setModelUpdating(true);
        const config = await api.setConversationModel(
          activeConversation.id,
          modelId
        );
        setConversationModelConfig(config);
        setSelectedModelId(config.modelId);
        toast.success(
          `Modelo atualizado para ${config.modelName || "modelo selecionado"}`
        );
      } catch (error) {
        console.error("Error updating conversation model:", error);
        toast.error("Não foi possível atualizar o modelo da conversa");
      } finally {
        setModelUpdating(false);
      }
    },
    [activeConversation, api]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "ggai.layout.panelRatio",
      panelRatio.toString()
    );
  }, [panelRatio]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      event.preventDefault();
      updatePanelRatio(event.clientX);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isResizingRef.current || event.touches.length !== 1) return;
      updatePanelRatio(event.touches[0].clientX);
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
  }, [updatePanelRatio]);

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
        setCompletedTaskIds(new Set());
      } catch (err) {
        console.error("Failed to fetch dashboard snapshot", err);
        const message =
          err instanceof Error
            ? err.message
            : "Falha ao carregar dados do dashboard.";
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

  useEffect(() => {
    let mounted = true;
    const loadCollections = async () => {
      try {
        if (mounted) {
          setCollectionsLoading(true);
        }
        const data = await api.getDashboardCollections();
        if (mounted) {
          setCollections(data);
          setCollectionsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard collections", err);
        if (mounted) {
          setCollectionsLoading(false);
        }
      }
    };
    loadCollections();
    return () => {
      mounted = false;
    };
  }, [api]);

  useEffect(() => {
    if (activeUtility !== "inbox") return;
    let cancelled = false;
    const fetchInbox = async () => {
      try {
        setInboxLoading(true);
        const notes = await api.getInboxNotes(20);
        if (!cancelled) {
          setInboxNotes(notes);
          setInboxError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Falha ao carregar notas da inbox.";
          setInboxError(message);
        }
      } finally {
        if (!cancelled) {
          setInboxLoading(false);
        }
      }
    };
    fetchInbox();
    return () => {
      cancelled = true;
    };
  }, [activeUtility, api]);

  useEffect(() => {
    if (activeUtility !== "inbox") {
      setExpandedInboxPath(null);
      setExpandedInboxContent(null);
      setExpandedInboxFrontmatter(null);
      setExpandedInboxError(null);
    }
  }, [activeUtility]);

  useEffect(() => {
    if (activeUtility !== "search") {
      setSearchTerm("");
    }
  }, [activeUtility]);

  useEffect(() => {
    if (activeUtility !== "tasks") {
      setSelectedTaskId(null);
      setSelectedTaskPath(null);
      setSelectedTaskTitle(null);
      setSelectedTaskHeading(null);
      setSelectedTaskContent(null);
      setSelectedTaskError(null);
    }
  }, [activeUtility]);

  useEffect(() => {
    if (activeUtility === "search" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeUtility]);

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
    return FALLBACK_FOCUS_SUMMARY;
  }, [snapshot]);

  const tasksWithPreferences = useMemo(() => {
    return tasksList.map((task, index) => {
      const overridePriority = priorityMap?.[task.id];
      return {
        ...task,
        priority: overridePriority ?? task.priority,
        pinned: pinnedTaskIds.includes(task.id),
        originalIndex: index,
      };
    });
  }, [tasksList, priorityMap, pinnedTaskIds]);

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
    if (!selectedTaskId) return;
    const stillExists = tasksWithPreferences.some(
      (task) => task.id === selectedTaskId
    );
    if (!stillExists) {
      setSelectedTaskId(null);
      setSelectedTaskPath(null);
      setSelectedTaskTitle(null);
      setSelectedTaskHeading(null);
      setSelectedTaskContent(null);
      setSelectedTaskError(null);
    }
  }, [tasksWithPreferences, selectedTaskId]);

  useEffect(() => {
    setBoardOrder((prev) => {
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
  }, [tasksWithPreferences]);

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

  const timelineCards = useMemo<TimelineCard[]>(() => {
    if (!snapshot) return FALLBACK_TIMELINE;

    const cards: TimelineCard[] = [];
    const focus = snapshot.data?.focus;
    const timeContext = snapshot.data?.timeContext;
    const tasksData = snapshot.data?.tasks;

    // 🧠 PRIORIDADE 1: Insights de Tarefas com Inteligência
    if (tasksData?.summary?.recommendations && tasksData.summary.recommendations.length > 0) {
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
        confidence: 0.90,
        tags: focus.weekly_focus.tags || ["#semana", "#foco"],
        timestamp: focus.weekly_focus.modified
          ? new Date(focus.weekly_focus.modified).toLocaleString()
          : "Esta semana",
      });
    }

    // 📋 PRIORIDADE 3: Tarefas Críticas
    if (tasksData?.metrics && (tasksData.metrics.overdue > 0 || tasksData.metrics.dueToday > 0)) {
      const criticalCount = tasksData.metrics.overdue + tasksData.metrics.dueToday;
      cards.push({
        id: "critical-tasks",
        type: "message",
        author: "assistant",
        title: "⚠️ Tarefas Críticas",
        body: `Você tem **${tasksData.metrics.overdue} tarefa(s) atrasada(s)** e **${tasksData.metrics.dueToday} para hoje**. Estão priorizadas no painel de tarefas.`,
        timestamp: formatTimestampLabel(snapshot.generatedAt),
        actions: [
          { label: "Ver tarefas", icon: <ListTodo className="h-4 w-4" /> },
          { label: "Organizar por prioridade", icon: <Sparkles className="h-4 w-4" /> },
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

    // Se não houver conteúdo, retorna o fallback
    return cards.length > 0 ? cards : FALLBACK_TIMELINE;
  }, [snapshot]);

  const pinnedInsights = useMemo(() => {
    const insights = [];
    
    // 1️⃣ Prioridade: Insights semânticos do Brain Cloud
    if (semanticInsights.length > 0) {
      semanticInsights.slice(0, 2).forEach((insight, index) => {
        insights.push({
          id: `semantic-${index}`,
          title: `🧠 ${insight.path?.split('/').pop() || 'Insight'}`,
          description: insight.excerpt?.substring(0, 120) + (insight.excerpt?.length > 120 ? '...' : ''),
          source: `Busca semântica • Score: ${(insight.score * 100).toFixed(0)}%`,
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
    
    // 3️⃣ Fallback se não houver conteúdo
    if (insights.length === 0) {
      return FALLBACK_PINNED_INSIGHTS;
    }
    
    return insights.slice(0, 3); // Limitar a 3 insights pinned
  }, [snapshot, semanticInsights]);

  const agentCards = useMemo<AgentCardData[]>(() => {
    const runs = snapshot?.data?.agents?.recentRuns;
    if (runs && runs.length > 0) {
      return runs.slice(0, 3).map(buildAgentCard);
    }
    return FALLBACK_AGENT_CARDS;
  }, [snapshot]);

  const dailyNotesList = useMemo(() => {
    const notes = snapshot?.data?.focus?.daily_notes || [];
    return notes.map((note, index) => ({
      id: note.path || `${note.title}-${index}`,
      title: note.title || "Nota diária",
      excerpt: note.excerpt || "Sem resumo disponível.",
      modified: note.modified,
    }));
  }, [snapshot]);

  const workflowTemplates = useMemo(
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
    const term = searchTerm.trim().toLowerCase();
    if (term.length < 2) return [];
    return searchableCards
      .filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.excerpt?.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [searchTerm, searchableCards]);

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
    return FALLBACK_CHAT_THREADS;
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
    ],
    []
  );

  const activeUtilityMeta = useMemo(() => {
    if (activeUtility === "shortcuts") {
      return { id: "shortcuts", label: "Shortcuts", icon: Keyboard };
    }
    if (activeUtility === "mcpTools") {
      return { id: "mcpTools", label: "Tools", icon: Cpu };
    }
    return (
      utilityButtons.find((button) => button.id === activeUtility) ??
      utilityButtons[0]
    );
  }, [utilityButtons, activeUtility]);
  const timelineFlex = isTimelineCollapsed ? 0 : panelRatio;
  const executionFlex = isTimelineCollapsed ? 1 : Math.max(0.3, 1 - panelRatio);

  const renderUtilityContent = () => {
    if (activeUtility === "inbox") {
      if (inboxLoading) {
        return (
          <div className="flex h-24 items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            Carregando notas da inbox...
          </div>
        );
      }
      if (inboxError) {
        return <p className="text-xs text-rose-400">{inboxError}</p>;
      }
      if (inboxNotes.length === 0) {
        return (
          <p className="text-xs text-zinc-500">
            Nenhuma nota bruta encontrada na inbox. Capture algo via WhatsApp ou
            composer para alimentar este painel.
          </p>
        );
      }
      return (
        <div className="space-y-3">
          {inboxNotes.map((note) => {
            const modifiedLabel = note.modified
              ? new Date(note.modified).toLocaleString()
              : null;
            const sizeLabel =
              typeof note.size === "number" && Number.isFinite(note.size)
                ? `${Math.max(1, Math.round(note.size / 1024))} KB`
                : null;
            const isExpanded = expandedInboxPath === note.path;
            return (
              <div
                key={note.path}
                className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {note.title}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">
                      {note.snippet}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                      {modifiedLabel && (
                        <span className="rounded-full border border-neutral-800 px-2 py-0.5">
                          Atualizado {modifiedLabel}
                        </span>
                      )}
                      {sizeLabel && (
                        <span className="rounded-full border border-neutral-800 px-2 py-0.5">
                          {sizeLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenInboxNote(note.path)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      isExpanded
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                        : "border-neutral-800 bg-neutral-900 text-emerald-300 hover:border-neutral-600 hover:bg-neutral-800"
                    }`}
                  >
                    {isExpanded ? "Fechar" : "Abrir"}
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3">
                    {expandedInboxLoading ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        Carregando conteúdo...
                      </div>
                    ) : expandedInboxError ? (
                      <p className="text-xs text-rose-400">
                        {expandedInboxError}
                      </p>
                    ) : (
                      <div className="max-h-72 space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed text-zinc-100">
                        {expandedInboxFrontmatter &&
                          expandedInboxFrontmatter.trim() && (
                            <div className="mb-3">
                              <div className="mb-1.5 text-xs font-medium text-zinc-400">
                                Frontmatter
                              </div>
                              <pre className="overflow-x-auto rounded border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs leading-relaxed text-emerald-200">
                                {expandedInboxFrontmatter}
                              </pre>
                            </div>
                          )}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children, ...props }) => (
                              <p
                                className="whitespace-pre-line text-sm leading-relaxed text-zinc-200"
                                {...props}
                              >
                                {children}
                              </p>
                            ),
                            h1: ({ ...props }) => (
                              <h1
                                className="mt-4 text-lg font-semibold text-zinc-50"
                                {...props}
                              />
                            ),
                            h2: ({ ...props }) => (
                              <h2
                                className="mt-4 text-base font-semibold text-zinc-50"
                                {...props}
                              />
                            ),
                            h3: ({ ...props }) => (
                              <h3
                                className="mt-3 text-sm font-semibold text-zinc-200"
                                {...props}
                              />
                            ),
                            ul: ({ ...props }) => (
                              <ul
                                className="ml-4 list-disc space-y-1 text-zinc-200"
                                {...props}
                              />
                            ),
                            ol: ({ ...props }) => (
                              <ol
                                className="ml-4 list-decimal space-y-1 text-zinc-200"
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
                              const childArray =
                                React.Children.toArray(children);
                              const content = childArray
                                .map((child) =>
                                  typeof child === "string" ? child : ""
                                )
                                .join("");
                              const trimmed = content.replace(/\n+$/, "");
                              const isInline =
                                !className?.includes("language-");
                              if (isInline) {
                                return (
                                  <code
                                    className="rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-[13px] text-emerald-300"
                                    {...props}
                                  >
                                    {trimmed}
                                  </code>
                                );
                              }
                              if (
                                !trimmed.includes("\n") &&
                                trimmed.length <= 80
                              ) {
                                return (
                                  <code
                                    className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-[13px] text-emerald-300"
                                    {...props}
                                  >
                                    {trimmed}
                                  </code>
                                );
                              }
                              return (
                                <pre className="overflow-x-auto rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-[13px] text-emerald-300">
                                  <code {...props}>{trimmed}</code>
                                </pre>
                              );
                            },
                            blockquote: ({ ...props }) => (
                              <blockquote
                                className="border-l-2 border-neutral-700 pl-3 text-zinc-300"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {expandedInboxContent || note.snippet}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (activeUtility === "tasks") {
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
            const isActive = selectedTaskId === task.id;
            const metaParts: string[] = [];
            if (task.project) metaParts.push(task.project);
            if (task.dueDate)
              metaParts.push(`Prazo ${formatDateShort(task.dueDate)}`);
            if (task.dueTime) metaParts.push(formatTimeShort(task.dueTime));
            const descriptor = getPriorityDescriptor(task.priority);
            const isToggling = togglingTaskId === task.id;

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
            const order = boardOrder[column.id] || [];
            const columnTasks = order
              .map((taskId) => tasksById.get(taskId))
              .filter((value): value is Task => Boolean(value));
            const isDropTarget =
              boardDragState?.taskId &&
              boardDragState?.fromColumn !== column.id;

            return (
              <div
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const droppedId =
                    boardDragState?.taskId ||
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
                    taskViewMode === "list"
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
                    taskViewMode === "kanban"
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
                            taskSortBy === option.value
                              ? "text-emerald-300"
                              : ""
                          }`}
                          onClick={() => handleSortChange(option.value)}
                        >
                          {option.label}
                          {taskSortBy === option.value && (
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
                  disabled={aiCleanupLoading}
                  className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
                >
                  {aiCleanupLoading ? (
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
                {taskViewMode === "kanban"
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
    if (activeUtility === "dailyNotes") {
      return dailyNotesList.length > 0 ? (
        <div className="space-y-3">
          {dailyNotesList.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <p className="text-sm font-semibold text-zinc-100">
                {note.title}
              </p>
              <p className="mt-2 text-sm text-zinc-300">{note.excerpt}</p>
              {note.modified && (
                <p className="mt-3 text-[11px] uppercase tracking-wide text-zinc-500">
                  Atualizado {new Date(note.modified).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Sem notas diárias recentes. Capture algo com /nota para começar.
        </p>
      );
    }

    if (activeUtility === "workflows") {
      return (
        <div className="space-y-3">
          {workflowTemplates.map((workflow) => (
            <div
              key={workflow.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <p className="text-sm font-semibold text-zinc-100">
                {workflow.title}
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                {workflow.description}
              </p>
              <button className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:bg-neutral-800">
                Abrir fluxo
              </button>
            </div>
          ))}
        </div>
      );
    }

    if (activeUtility === "search") {
      return searchTerm.trim().length < 2 ? (
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

    if (activeUtility === "agents") {
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

    if (activeUtility === "projects") {
      if (collectionsLoading) {
        return (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/50" />
            <div className="h-20 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/50" />
          </div>
        );
      }
      if (!collections.length) {
        return (
          <p className="text-xs text-zinc-500">
            Crie projetos na barra lateral para agrupar notas e tarefas
            recorrentes aqui.
          </p>
        );
      }
      return (
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
            const isActive = collection.id === collectionId;
            const description = collection.description?.trim();
            const filter = collection.filter?.trim();
            const initial = collection.label.charAt(0).toUpperCase();
            return (
              <div
                key={collection.id}
                className={[
                  "rounded-xl border bg-neutral-950 p-4 transition",
                  isActive
                    ? "border-emerald-500/50 shadow-emerald-500/10"
                    : "border-neutral-800",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold uppercase",
                        isActive
                          ? "border-emerald-400/60 text-emerald-200"
                          : "border-neutral-800 text-zinc-400",
                      ].join(" ")}
                    >
                      {initial}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {collection.label}
                      </p>
                      {description && (
                        <p className="mt-1 text-xs text-zinc-400">
                          {description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                        {filter && (
                          <span className="rounded-full border border-neutral-800 px-2 py-0.5">
                            Filtro: {filter}
                          </span>
                        )}
                        {isActive && (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                            Ativo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleProjectFocus(collection.id)}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-xs transition",
                      isActive
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                        : "border-neutral-800 bg-neutral-900 text-emerald-300 hover:border-neutral-600 hover:bg-neutral-800",
                    ].join(" ")}
                  >
                    Focar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeUtility === "chatHistory") {
      const { recent, older } = chatThreadsByRecency;

      if (recent.length === 0 && older.length === 0) {
        return (
          <p className="text-xs text-zinc-500">
            Ainda não há conversas registradas. Inicie uma conversa no painel
            central para construir seu histórico com o Cognito.
          </p>
        );
      }

      const renderThreads = (threads: ChatThread[]) => (
        <div className="space-y-2">
          {threads.map((thread) => {
            const dateLabel = formatDateShort(thread.updatedAt);
            const timeLabel = formatTimestampLabel(thread.updatedAt);
            const updatedLabel = dateLabel
              ? `${dateLabel} • ${timeLabel}`
              : timeLabel;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => handleOpenChatThread(thread.id)}
                className="group w-full rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-left transition hover:border-neutral-600 hover:bg-neutral-900/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-200">
                        {thread.title}
                      </p>
                      {thread.pinned && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
                          <Pin className="h-3 w-3 text-emerald-300" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                      {thread.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                      <span className="rounded-full border border-neutral-800 px-2 py-0.5">
                        {updatedLabel}
                      </span>
                      <span className="rounded-full border border-neutral-800 px-2 py-0.5">
                        {Math.max(1, thread.messageCount)} mensagens
                      </span>
                      {thread.tags?.map((tag) => (
                        <span
                          key={`${thread.id}-${tag}`}
                          className="rounded-full border border-neutral-800 px-2 py-0.5"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      );

      return (
        <div className="space-y-4">
          {recent.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Últimos 7 dias
              </p>
              {renderThreads(recent)}
            </div>
          )}
          {older.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Conversas anteriores
              </p>
              {renderThreads(older)}
            </div>
          )}
          <p className="text-xs text-zinc-500">
            O histórico completo também aparece abaixo do painel principal do
            chat.
          </p>
        </div>
      );
    }

    if (activeUtility === "knowledgeGraph") {
      return (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
          <KnowledgeGraphVisualizer />
        </div>
      );
    }

    if (activeUtility === "mcpTools") {
      return (
        <div className="space-y-3">
          {availableMcpTools.map((tool) => (
            <div
              key={tool.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <p className="text-sm font-semibold text-emerald-300">
                {tool.title}
              </p>
              <p className="mt-2 text-sm text-zinc-300">{tool.description}</p>
              <code className="mt-3 inline-block rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-zinc-400">
                {tool.id}
              </code>
            </div>
          ))}
        </div>
      );
    }

    if (activeUtility === "shortcuts") {
      return (
        <div className="space-y-3">
          {shortcutList.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {shortcut.combo.map((key, index) => (
                  <span
                    key={`${shortcut.description}-${key}-${index}`}
                    className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 font-semibold text-zinc-200"
                  >
                    {key}
                  </span>
                ))}
              </div>
              <p className="text-sm text-zinc-300">{shortcut.description}</p>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const filteredTasks = useMemo(() => {
    if (activeUtility !== "tasks") return [];
    const base = tasksWithPreferences.filter(
      (task) => !completedTaskIds.has(task.id)
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

      if (taskSortBy === "priority") {
        const delta =
          resolvePriorityWeight(a.priority) - resolvePriorityWeight(b.priority);
        if (delta !== 0) return delta;
      } else if (taskSortBy === "due") {
        const delta = computeDueValue(a) - computeDueValue(b);
        if (delta !== 0) return delta;
      } else if (taskSortBy === "project") {
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
    activeUtility,
    tasksWithPreferences,
    completedTaskIds,
    taskSortBy,
    resolvePriorityWeight,
  ]);

  const focusHeadline = useMemo(() => {
    const firstDaily = snapshot?.data?.focus?.daily_notes?.[0]?.title;
    if (firstDaily) return firstDaily;
    const weekly = snapshot?.data?.focus?.weekly_focus?.title;
    if (weekly) return weekly;
    return "Execução do piloto multi-tenant";
  }, [snapshot]);

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
      setComposerValue("/nota ");
    } else if (quickAction === "voice-capture") {
      setComposerValue("/voz ");
    } else if (quickAction === "media-import") {
      setComposerValue("/midia ");
    }
  }, [quickAction]);

  const handleTaskSelect = useCallback(
    async (task: Task) => {
      if (!task.filePath) {
        setSelectedTaskId(null);
        setSelectedTaskPath(null);
        setSelectedTaskTitle(task.title);
        setSelectedTaskHeading(task.headingContext || task.project || null);
        setSelectedTaskContent(null);
        setSelectedTaskError("Esta tarefa não possui nota vinculada.");
        return;
      }

      if (selectedTaskId === task.id && !selectedTaskLoading) {
        setSelectedTaskId(null);
        setSelectedTaskPath(null);
        setSelectedTaskTitle(null);
        setSelectedTaskHeading(null);
        setSelectedTaskContent(null);
        setSelectedTaskError(null);
        return;
      }

      try {
        setSelectedTaskId(task.id);
        setSelectedTaskPath(task.filePath);
        setSelectedTaskTitle(task.title);
        setSelectedTaskHeading(task.headingContext || task.project || null);
        setSelectedTaskLoading(true);
        setSelectedTaskError(null);
        setSelectedTaskContent(null);
        const result = await api.getVaultNoteContent(task.filePath);
        setSelectedTaskContent(result.content || "");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Falha ao carregar a nota vinculada.";
        setSelectedTaskError(message);
      } finally {
        setSelectedTaskLoading(false);
      }
    },
    [api, selectedTaskId, selectedTaskLoading]
  );

  const handleToggleTask = useCallback(
    async (task: Task, completed: boolean) => {
      if (togglingTaskId) return;
      if (!task.filePath) {
        setSelectedTaskError(
          "Não foi possível atualizar: tarefa sem nota vinculada."
        );
        return;
      }

      try {
        setTogglingTaskId(task.id);
        await api.toggleTaskCompletion({
          filePath: task.filePath,
          lineNumber: task.lineNumber ?? undefined,
          completed,
          title: task.title,
        });
        setCompletedTaskIds((prev) => {
          const next = new Set(prev);
          if (completed) next.add(task.id);
          else next.delete(task.id);
          return next;
        });
        setSelectedTaskId(null);
        setSelectedTaskPath(null);
        setSelectedTaskTitle(null);
        setSelectedTaskHeading(null);
        setSelectedTaskContent(null);
        setSelectedTaskError(null);
        await loadSnapshot({ silent: true });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Falha ao atualizar status da tarefa.";
        setSelectedTaskError(message);
      } finally {
        setTogglingTaskId(null);
      }
    },
    [api, loadSnapshot, togglingTaskId]
  );

  const handleTogglePinTask = useCallback(
    async (taskId: string) => {
      const isPinned = pinnedTaskIds.includes(taskId);
      const nextPinned = isPinned
        ? pinnedTaskIds.filter((id) => id !== taskId)
        : [...pinnedTaskIds, taskId];
      setPinnedTaskIds(nextPinned);
      setTaskPreferences((prev) =>
        prev ? { ...prev, pinnedTaskIds: nextPinned } : prev
      );
      if (!taskPrefsReady) return;
      try {
        await persistTaskPreferences({ pinnedTaskIds: nextPinned });
      } catch (error) {
        console.error("Failed to update pinned tasks", error);
        toast.error("Não foi possível atualizar o destaque da tarefa.");
        setPinnedTaskIds(pinnedTaskIds);
        setTaskPreferences((prev) =>
          prev ? { ...prev, pinnedTaskIds } : prev
        );
      }
    },
    [pinnedTaskIds, persistTaskPreferences, taskPrefsReady]
  );

  const handleChangeTaskPriority = useCallback(
    async (taskId: string, priority: string | null) => {
      const previous = priorityMap[taskId] ?? null;
      setOpenPriorityMenuId(null);
      setPriorityMap((prev) => {
        const next = { ...prev };
        if (priority === null) delete next[taskId];
        else next[taskId] = priority;
        return next;
      });
      setTaskPreferences((prev) => {
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
        setPriorityMap((prev) => {
          const next = { ...prev };
          if (previous === null || previous === undefined) delete next[taskId];
          else next[taskId] = previous;
          return next;
        });
        setTaskPreferences((prev) => {
          if (!prev) return prev;
          const nextPriorityMap = { ...(prev.priorityMap || {}) };
          if (previous === null || previous === undefined)
            delete nextPriorityMap[taskId];
          else nextPriorityMap[taskId] = previous;
          return { ...prev, priorityMap: nextPriorityMap };
        });
      }
    },
    [persistTaskPreferences, priorityMap, taskPrefsReady]
  );

  const handleViewModeChange = useCallback(
    async (mode: "list" | "kanban") => {
      if (taskViewMode === mode) return;
      const previous = taskViewMode;
      setTaskViewMode(mode);
      if (!taskPrefsReady) return;
      try {
        await persistTaskPreferences({ viewMode: mode });
      } catch (error) {
        console.error("Failed to update view mode", error);
        toast.error("Não foi possível alterar a visualização agora.");
        setTaskViewMode(previous);
      }
    },
    [persistTaskPreferences, taskPrefsReady, taskViewMode]
  );

  const handleSortChange = useCallback(
    async (sort: "natural" | "due" | "priority" | "project") => {
      if (taskSortBy === sort) {
        setShowSortMenu(false);
        return;
      }
      const previous = taskSortBy;
      setTaskSortBy(sort);
      setShowSortMenu(false);
      if (!taskPrefsReady) return;
      try {
        await persistTaskPreferences({ sortBy: sort });
      } catch (error) {
        console.error("Failed to update sort order", error);
        toast.error("Não foi possível atualizar a ordenação agora.");
        setTaskSortBy(previous);
      }
    },
    [persistTaskPreferences, taskPrefsReady, taskSortBy]
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
    if (aiCleanupLoading) return;
    setAiCleanupLoading(true);
    try {
      const result = await api.triggerTaskCleanup({ window: "week" });
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to trigger AI cleanup", error);
      toast.error("Não foi possível acionar a limpeza por IA agora.");
    } finally {
      setAiCleanupLoading(false);
    }
  }, [aiCleanupLoading, api]);

  const handleContextSave = useCallback(async () => {
    try {
      await persistTaskPreferences({
        contextTemplate: { ...taskContextDraft },
        lastContextId: "default",
      });
      toast.success("Contexto salvo para os agentes Cognito.");
      setContextModalOpen(false);
    } catch (error) {
      console.error("Failed to save task context", error);
      toast.error("Não foi possível salvar o contexto agora.");
    }
  }, [persistTaskPreferences, taskContextDraft]);

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
      setBoardDragState({ taskId, fromColumn: column });
      event.dataTransfer.setData("application/task-id", taskId);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleBoardDragEnd = useCallback(() => {
    setBoardDragState(null);
  }, []);

  const handleBoardDrop = useCallback(
    (taskId: string, targetColumn: string) => {
      if (!taskId) return;
      let nextLayout: Record<string, string[]> | null = null;
      setBoardOrder((prev) => {
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
      setBoardDragState(null);
      if (nextLayout && taskPrefsReady) {
        persistTaskPreferences({ boardOrder: nextLayout }).catch((error) => {
          console.error("Failed to persist board layout", error);
          toast.error("Não foi possível salvar a organização do board.");
        });
      }
    },
    [persistTaskPreferences, taskPrefsReady]
  );

  const handleProjectFocus = useCallback(
    (projectId: string) => {
      const params = new URLSearchParams(location.search);
      params.set("collection", projectId);
      navigate(`/?${params.toString()}`);
    },
    [location.search, navigate]
  );

  const handleClearProjectFocus = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete("collection");
    const searchValue = params.toString();
    navigate(`/${searchValue ? `?${searchValue}` : ""}`);
  }, [location.search, navigate]);

  const handleOpenChatThread = useCallback(
    (threadId: string) => {
      navigate(`/chat?thread=${encodeURIComponent(threadId)}`);
    },
    [navigate]
  );

  const handleOpenInboxNote = useCallback(
    async (path: string) => {
      if (expandedInboxPath === path && !expandedInboxLoading) {
        setExpandedInboxPath(null);
        setExpandedInboxContent(null);
        setExpandedInboxError(null);
        setExpandedInboxFrontmatter(null);
        return;
      }
      try {
        setExpandedInboxPath(path);
        setExpandedInboxLoading(true);
        setExpandedInboxError(null);
        setExpandedInboxContent(null);
        setExpandedInboxFrontmatter(null);
        const result = await api.getInboxNoteContent(path);
        setExpandedInboxContent(result?.content || "");
        setExpandedInboxFrontmatter(result?.frontmatter || null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Falha ao carregar conteúdo da nota.";
        setExpandedInboxError(message);
      } finally {
        setExpandedInboxLoading(false);
      }
    },
    [api, expandedInboxLoading, expandedInboxPath]
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col gap-4 overflow-hidden text-zinc-100">
      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-950/80 px-6 py-4 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Foco do dia
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {focusHeadline}
            </h2>
            <p className="text-xs text-zinc-500">{updatedLabel}</p>
            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
            {activeCollection && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                <Sparkles className="h-3 w-3" />
                <span>
                  Projeto ativo:&nbsp;
                  <strong className="text-emerald-100">
                    {activeCollection.label}
                  </strong>
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {focusSummary.map((item) => (
              <div
                key={item.label}
                className="min-w-[88px] rounded-lg bg-neutral-900/70 px-3 py-2 text-center"
              >
                <p className="text-lg font-semibold text-zinc-100">
                  {item.value}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  {item.label}
                </p>
              </div>
            ))}
            <button
              onClick={() => loadSnapshot({ silent: true })}
              className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
            >
              <RefreshCw
                className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
              />
              Recarregar
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        <div ref={layoutRef} className="flex flex-1 min-h-0 gap-4">
          <section
            className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-800/60 bg-neutral-950/80 shadow-2xl shadow-black/30 transition-all duration-300 ${
              isTimelineCollapsed
                ? "pointer-events-none opacity-0 w-0"
                : "opacity-100"
            }`}
            style={{
              flexGrow: timelineFlex,
              flexBasis: timelineFlex === 0 ? "0%" : "0",
            }}
          >
            {chatMode === "conversation" ? (
                <ConversationView
                  conversation={activeConversation}
                  messages={chatMessages}
                  streamingMessage={streamingMessage}
                  thinkingMessage={thinkingMessage}
                  isLoading={chatLoading}
                  isThinking={isThinking}
                  onSendMessage={handleSendMessage}
                  onBackToTimeline={handleBackToTimeline}
                  models={modelOptions}
                  selectedModelId={selectedModelId}
                  onModelChange={handleModelChange}
                  modelsLoading={modelsLoading || modelUpdating}
                  currentModelConfig={conversationModelConfig}
                />
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Timeline IA
                  </p>
                  <button
                    onClick={handleCollapseTimeline}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
                    aria-label="Recolher timeline"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  {snapshot?.warnings && snapshot.warnings.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                      {snapshot.warnings.map((warning, index) => (
                        <p key={index}>
                          <strong className="uppercase tracking-wide">
                            {warning.scope || "Aviso"}:
                          </strong>{" "}
                          {warning.message}
                        </p>
                      ))}
                    </div>
                  )}
                  {loading ? (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-400" />
                      Carregando inteligência em tempo real...
                    </div>
                  ) : (
                    timelineCards.map((card) => (
                      <TimelineCard key={card.id} card={card} />
                    ))
                  )}
                </div>
                <div className="border-t border-neutral-800/60 bg-neutral-950/60 px-6 py-4">
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
                          onChange={(event) =>
                            setComposerValue(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && composerValue.trim()) {
                              handleStartChat(composerValue.trim());
                              setComposerValue("");
                            }
                          }}
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
                      <button
                        onClick={() => {
                          if (composerValue.trim()) {
                            handleStartChat(composerValue.trim());
                            setComposerValue("");
                          }
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-200 text-zinc-950 transition hover:border-neutral-500 hover:bg-neutral-100"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        Use{" "}
                        <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">
                          /nota
                        </kbd>{" "}
                        <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">
                          /tarefa
                        </kbd>{" "}
                        <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">
                          /resumo
                        </kbd>
                      </span>
                      <span>{composerValue.length}/500</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {isTimelineCollapsed ? (
            <div className="flex items-center">
              <button
                onClick={handleExpandTimeline}
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
                  {activeUtility === "tasks" && (
                    <button className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:bg-neutral-800">
                      <ListTodo className="h-3 w-3" />
                      Nova tarefa
                    </button>
                  )}
                  {activeUtility === "search" && (
                    <div className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-zinc-100">
                      <SearchIcon className="h-4 w-4 text-zinc-400" />
                      <input
                        ref={searchInputRef}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Buscar no snapshot..."
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
              {activeUtility !== "search" && activeUtility !== "tasks" && (
                <p className="mt-2 text-xs text-zinc-500">
                  {activeUtility === "inbox"
                    ? "Notas brutas e capturas rápidas vindas do Segundo Cérebro."
                    : activeUtility === "dailyNotes"
                    ? "Notas capturadas automaticamente e curadoria diária."
                    : activeUtility === "workflows"
                    ? "Fluxos assistidos para revisões e rituais estratégicos."
                    : activeUtility === "agents"
                    ? "Status dos agentes autônomos e execuções recentes."
                    : activeUtility === "projects"
                    ? "Organize e ative projetos do Vectal em um painel dedicado."
                    : activeUtility === "chatHistory"
                    ? "Histórico resumido das conversas recentes com o Cognito."
                    : activeUtility === "knowledgeGraph"
                    ? "Visualização do grafo de conhecimento do seu Segundo Cérebro."
                    : activeUtility === "mcpTools"
                    ? "Ferramentas MCP disponíveis para o contexto atual."
                    : activeUtility === "shortcuts"
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
            const isActive = button.id === activeUtility;
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
                activeUtility === "shortcuts"
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

      {selectedTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setSelectedTaskId(null);
            setSelectedTaskPath(null);
            setSelectedTaskTitle(null);
            setSelectedTaskHeading(null);
            setSelectedTaskContent(null);
            setSelectedTaskError(null);
          }}
        >
          <div
            className="relative mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-4">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  {selectedTaskTitle || "Detalhes da Tarefa"}
                </h2>
                {selectedTaskHeading && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {selectedTaskHeading}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedTaskId(null);
                  setSelectedTaskPath(null);
                  setSelectedTaskTitle(null);
                  setSelectedTaskHeading(null);
                  setSelectedTaskContent(null);
                  setSelectedTaskError(null);
                }}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-800 text-zinc-400 transition hover:border-neutral-600 hover:bg-neutral-900 hover:text-zinc-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedTaskLoading ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  Carregando nota...
                </div>
              ) : selectedTaskError ? (
                <p className="text-sm text-rose-400">{selectedTaskError}</p>
              ) : selectedTaskPath && selectedTaskContent ? (
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
                    {selectedTaskContent}
                  </ReactMarkdown>
                </div>
              ) : selectedTaskPath ? (
                <p className="text-sm text-zinc-500">Nota vinculada vazia.</p>
              ) : (
                <p className="text-sm text-zinc-500">
                  Esta tarefa não possui nota vinculada no Segundo Cérebro.
                </p>
              )}
            </div>
            {selectedTaskPath && (
              <div className="border-t border-neutral-800 px-6 py-3">
                <p className="text-xs text-zinc-500">
                  Nota: <span className="font-mono">{selectedTaskPath}</span>
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
                  value={taskContextDraft.workDescription}
                  onChange={(event) =>
                    setTaskContextDraft((prev) => ({
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
                  value={taskContextDraft.shortTermFocus}
                  onChange={(event) =>
                    setTaskContextDraft((prev) => ({
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
                  value={taskContextDraft.longTermGoals}
                  onChange={(event) =>
                    setTaskContextDraft((prev) => ({
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
                  value={taskContextDraft.otherContext}
                  onChange={(event) =>
                    setTaskContextDraft((prev) => ({
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
    </div>
  );
};

type TimelineCardProps = {
  card: TimelineCard;
};

const TimelineCard: React.FC<TimelineCardProps> = ({ card }) => {
  if (card.type === "message") {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-lg shadow-black/20 transition hover:border-neutral-600 hover:shadow-black/10">
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
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg shadow-emerald-500/10 transition hover:border-emerald-400/50">
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
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-lg shadow-black/15 transition hover:border-neutral-600 hover:shadow-black/10">
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
    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5 shadow-lg shadow-sky-500/10 transition hover:border-sky-400/40">
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

export default BusinessIntelligenceHub;
