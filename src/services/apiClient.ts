// src/services/apiClient.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  AIProvider as ProviderKey,
  AIProviderConfig as SettingsAIProviderConfig,
  ModelContext,
  ModelInfo as SettingsModelInfo,
} from "../components/settings/types";

// --- Interfaces de Tipos ---

export interface FeedbackAction {
  id: string;
  type:
    | "decision"
    | "insight_validation"
    | "action_taken"
    | "learning_captured";
  title: string;
  description: string;
  timestamp: string;
  status: "pending" | "processing" | "completed" | "failed";
  obsidianNote?: string;
  relatedProject?: string;
  impact?: string;
}

export interface SynergyInsight {
  id: string;
  type:
    | "unexpected_connection"
    | "knowledge_gap"
    | "success_pattern"
    | "strategic_question";
  title: string;
  description: string;
  confidence: number;
  urgency: "high" | "medium" | "low";
  relatedNotes: string[];
  suggestedAction: string;
  potentialImpact: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  agent_name?: string;
  start_time: string;
  end_time?: string | null;
  status: string;
  log?: string | null;
}

export interface FocusNote {
  path: string;
  title: string;
  excerpt: string;
  tags?: string[];
  modified?: string;
}

export interface FocusSnapshot {
  daily_notes: FocusNote[];
  weekly_focus?: FocusNote | null;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface TimeContextActivity {
  id?: string;
  title?: string;
  summary?: string;
  path?: string;
  type?: string;
  modified?: string;
  tags?: string[];
}

export interface UpcomingDeadline {
  title: string;
  due_date?: string;
  due_time?: string;
  priority?: string;
  status?: string;
  file_path?: string;
}

export interface TimeContextSnapshot {
  reference_date: string;
  generated_at: string;
  timezone: string;
  date_info: Record<string, unknown>;
  recent_activities: TimeContextActivity[];
  upcoming_deadlines: UpcomingDeadline[];
  recurring_patterns?: Record<string, unknown>;
}

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  dueTime?: string;
  project?: string;
  priority?: string | null;
  tags?: string[];
  filePath?: string;
  sourceType?: string;
  headingContext?: string | null;
  lineNumber?: number | null;
}

export interface DashboardTasksPayload {
  due?: unknown;
  summary?: {
    recommendations?: string[];
    [key: string]: unknown;
  };
  overdue?: unknown;
  simplified: DashboardTask[];
  metrics: {
    overdue: number;
    dueToday: number;
    upcoming: number;
  };
}

export interface TaskPreferences {
  viewMode: "list" | "kanban";
  sortBy: string;
  pinnedTaskIds: string[];
  priorityMap: Record<string, string>;
  boardOrder?: Record<string, string[]>;
  lastContextId?: string | null;
  contextTemplate?: {
    workDescription?: string;
    shortTermFocus?: string;
    longTermGoals?: string;
    otherContext?: string;
  };
}

export interface CompletedTask {
  id?: string;
  title?: string;
  status?: string;
  completedAt?: string;
  project?: string;
  filePath?: string;
  priority?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  role: "user" | "assistant";
  content: string;
  contextSnapshot?: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  contextType: "global" | "project" | "note";
  contextProjectId?: string | null;
  contextNotePath?: string | null;
  projectName?: string;
  messageCount: number;
  lastMessagePreview?: string;
  detectedTags?: string[];
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface CurrentUserProfile {
  id: string;
  tenantId?: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
  status?: string;
  lastLoginAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationCreatePayload {
  contextType?: "global" | "project" | "note";
  contextProjectId?: string;
  contextNotePath?: string;
  title?: string;
}

export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  projectConversations: number;
  noteConversations: number;
  globalConversations: number;
  lastConversationAt?: string;
}

export interface AIProvider {
  id: string;
  providerName:
    | "openai"
    | "anthropic"
    | "deepseek"
    | "google"
    | "openrouter"
    | "azure"
    | "custom";
  displayName: string;
  baseUrl?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface AIProviderCreatePayload {
  providerName:
    | "openai"
    | "anthropic"
    | "deepseek"
    | "google"
    | "openrouter"
    | "azure"
    | "custom";
  displayName: string;
  apiKey: string;
  baseUrl?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface AIModel {
  id: string;
  modelId: string;
  displayName: string;
  description?: string;
  supportsStreaming: boolean;
  supportsFunctionCalling?: boolean;
  supportsVision?: boolean;
  maxTokens?: number;
  contextWindow?: number;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  isActive: boolean;
  isDefault: boolean;
  totalRequests?: number;
  totalTokens?: number;
  lastUsedAt?: string;
  providerId?: string;
  providerName?: string;
  providerDisplayName?: string;
}

export interface AIModelCreatePayload {
  modelId: string;
  displayName: string;
  description?: string;
  supportsStreaming?: boolean;
  supportsFunctionCalling?: boolean;
  supportsVision?: boolean;
  maxTokens?: number;
  contextWindow?: number;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface ConversationModelConfig {
  id: string;
  conversationId: string;
  modelId: string;
  temperature: number;
  maxTokens?: number;
  topP: number;
  createdAt: string;
  modelKey?: string;
  modelName?: string;
  providerId?: string;
  providerName?: string;
  providerDisplayName?: string;
  supportsStreaming?: boolean;
  model?: AIModel;
}

export interface ConversationResponsePayload {
  message: ChatMessage;
  usage?: Record<string, unknown> | null;
  provider?: {
    id?: string;
    name?: string;
    displayName?: string;
  };
  model?: {
    id?: string;
    identifier?: string;
    name?: string;
  };
}

type ConversationModelConfigResponse = {
  id: string;
  conversation_id: string;
  model_id: string;
  temperature?: number | string | null;
  max_tokens?: number | null;
  top_p?: number | string | null;
  created_at: string;
  model_key?: string | null;
  model_name?: string | null;
  provider_id?: string | null;
  provider_name?: string | null;
  provider_display_name?: string | null;
  supports_streaming?: boolean | null;
};

type ConversationMessageResponse = {
  id: string;
  conversation_id?: string;
  role: "user" | "assistant";
  content: string;
  context_snapshot?: Record<string, unknown> | null;
  created_at: string;
};

type ConversationResponseApiResponse = {
  message: ConversationMessageResponse;
  usage?: Record<string, unknown> | null;
  provider?: {
    id?: string;
    name?: string;
    displayName?: string;
  };
  model?: {
    id?: string;
    identifier?: string;
    name?: string;
  };
};

export interface ChatStreamOptions {
  providerOverride?: {
    provider?: string;
    model?: string;
    customProviderId?: string;
    temperature?: number;
    maxTokens?: number;
  };
  context?: string;
  conversationId?: string;
  tools?: boolean;
  projectName?: string;
  contextNotePath?: string;
  contextType?: string;
}

type AIProviderResponse = {
  id: string;
  provider_name?: string;
  display_name?: string;
  base_url?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  last_used_at?: string | null;
};

type AIModelResponse = {
  id: string;
  model_id?: string;
  display_name?: string;
  description?: string | null;
  supports_streaming?: boolean;
  supports_function_calling?: boolean;
  supports_vision?: boolean;
  max_tokens?: number | null;
  context_window?: number | null;
  cost_per_input_token?: number | null;
  cost_per_output_token?: number | null;
  is_active?: boolean;
  is_default?: boolean;
  total_requests?: number | null;
  total_tokens?: number | null;
  last_used_at?: string | null;
  provider_id?: string;
  provider_name?: string;
  provider_display_name?: string;
};

const toNumber = (
  value: number | string | null | undefined,
  fallback?: number
): number => {
  if (value === null || value === undefined) {
    return fallback ?? 0;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) {
    return fallback ?? 0;
  }
  return parsed;
};

const mapAIProvider = (data: AIProviderResponse): AIProvider => {
  const providerName = (data.provider_name ||
    "custom") as AIProvider["providerName"];

  return {
    id: data.id,
    providerName,
    displayName: data.display_name || "",
    baseUrl: data.base_url ?? undefined,
    isActive: data.is_active ?? true,
    isDefault: data.is_default ?? false,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    lastUsedAt: data.last_used_at ?? undefined,
  };
};

const mapAIModel = (data: AIModelResponse): AIModel => ({
  id: data.id,
  modelId: data.model_id || "",
  displayName: data.display_name || "",
  description: data.description ?? undefined,
  supportsStreaming: data.supports_streaming ?? false,
  supportsFunctionCalling: data.supports_function_calling ?? undefined,
  supportsVision: data.supports_vision ?? undefined,
  maxTokens: data.max_tokens ?? undefined,
  contextWindow: data.context_window ?? undefined,
  costPerInputToken: data.cost_per_input_token ?? undefined,
  costPerOutputToken: data.cost_per_output_token ?? undefined,
  isActive: data.is_active ?? true,
  isDefault: data.is_default ?? false,
  totalRequests: data.total_requests ?? undefined,
  totalTokens: data.total_tokens ?? undefined,
  lastUsedAt: data.last_used_at ?? undefined,
  providerId: data.provider_id ?? undefined,
  providerName: data.provider_name ?? undefined,
  providerDisplayName: data.provider_display_name ?? undefined,
});

const mapChatMessage = (data: ConversationMessageResponse): ChatMessage => ({
  id: data.id,
  conversationId: data.conversation_id,
  role: data.role,
  content: data.content,
  contextSnapshot: data.context_snapshot ?? undefined,
  createdAt: data.created_at,
});

const mapConversationModelConfig = (
  data: ConversationModelConfigResponse
): ConversationModelConfig => ({
  id: data.id,
  conversationId: data.conversation_id,
  modelId: data.model_id,
  temperature: toNumber(data.temperature, 0.7),
  maxTokens:
    data.max_tokens === null || data.max_tokens === undefined
      ? undefined
      : Number(data.max_tokens),
  topP: toNumber(data.top_p, 1),
  createdAt: data.created_at,
  modelKey: data.model_key ?? undefined,
  modelName: data.model_name ?? undefined,
  providerId: data.provider_id ?? undefined,
  providerName: data.provider_name ?? undefined,
  providerDisplayName: data.provider_display_name ?? undefined,
  supportsStreaming: data.supports_streaming ?? undefined,
});

export interface DashboardSnapshot {
  success: boolean;
  generatedAt: string;
  data: {
    focus: FocusSnapshot | null;
    timeContext: TimeContextSnapshot | null;
    tasks: DashboardTasksPayload;
    agents: {
      recentRuns: AgentRun[];
      stats: {
        running: number;
        success: number;
        failed: number;
        total: number;
      };
    };
    recentNotes?: FocusNote[];
  };
  warnings?: Array<{ scope?: string; message: string }>;
  config?: {
    restEnabled: boolean;
    mcpEnabled: boolean;
    baseUrl?: string;
    tenantId?: string | null;
  };
}

export interface DashboardCollection {
  id: string;
  label: string;
  description?: string;
  filter?: string;
  icon?: string;
}

export interface InboxNote {
  path: string;
  title: string;
  snippet: string;
  modified?: string | null;
  created?: string | null;
  size?: number | null;
}

export type BrainCloudConnectionMode = "rest" | "mcp";

export interface BrainCloudSettings {
  baseUrl: string;
  apiToken: string;
  tenantId: string;
  tenantPlan: string;
  mcpWs: string;
  mcpHttp: string;
  enableRest: boolean;
  enableMcp: boolean;
}

export const defaultBrainCloudSettings: BrainCloudSettings = {
  baseUrl: "",
  apiToken: "",
  tenantId: "",
  tenantPlan: "",
  mcpWs: "",
  mcpHttp: "",
  enableRest: true,
  enableMcp: true,
};

export const resolveApiBaseUrl = () => {
  if (typeof process !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    if (process.env.API_BASE_URL) {
      return process.env.API_BASE_URL;
    }
  }

  if (typeof window !== "undefined") {
    const globalOverride = (
      window as typeof window & {
        __APP_API_BASE_URL__?: string;
      }
    ).__APP_API_BASE_URL__;
    if (globalOverride) {
      return globalOverride;
    }
  }

  return "http://localhost:3002";
};

// --- Cliente da API ---

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  searchParams?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  retries?: number;
  cache?: RequestCache; // 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached'
}

export class APIClient {
  private baseUrl: string;
  private readonly aiConfigCacheTtlMs = 5 * 60 * 1000;
  private aiConfigCache: {
    data: SettingsAIProviderConfig;
    expiresAt: number;
  } | null = null;

  constructor() {
    this.baseUrl = resolveApiBaseUrl();
  }

  private isRefreshing = false;
  private failedQueue: {
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
  }[] = [];

  private logDebug(...args: unknown[]) {
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.debug("[APIClient]", ...args);
    }
  }

  private isTransientError(error: unknown): boolean {
    if (!error) return false;
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }
    if (error instanceof TypeError) {
      return true;
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("failed to fetch") ||
        message.includes("temporarily") ||
        message.includes("connection reset")
      );
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildUrl(
    endpoint: string,
    searchParams?: Record<string, string | number | boolean | undefined>
  ): string {
    let url = `${this.baseUrl}${endpoint}`;
    if (searchParams) {
      const usp = new URLSearchParams();
      for (const [key, value] of Object.entries(searchParams)) {
        if (value === undefined || value === null) continue;
        usp.append(key, String(value));
      }
      const queryString = usp.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }
    return url;
  }

  private setAIConfigCache(config: SettingsAIProviderConfig) {
    this.aiConfigCache = {
      data: config,
      expiresAt: Date.now() + this.aiConfigCacheTtlMs,
    };
  }

  private clearAIConfigCache() {
    this.aiConfigCache = null;
  }

  private processQueue = (error: any, token = null) => {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  };

  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      searchParams,
      retries = 0,
      signal,
      cache,
      ...restOptions
    } = options;
    const url = this.buildUrl(endpoint, searchParams);
    const method = restOptions.method ?? "GET";

    const attemptRequest = async (attempt: number): Promise<T> => {
      const storage =
        typeof window !== "undefined" ? window.localStorage : null;
      const token = storage?.getItem("token") ?? null;

      // DEBUG: Log auth info for specific endpoints
      if (endpoint.includes("/models") || endpoint.includes("/settings")) {
        console.log(
          `[apiClient] ${endpoint} - Token status: ${
            token ? `FOUND (${token.substring(0, 20)}...)` : "NOT FOUND"
          }`,
          { hasStorage: !!storage, tokenLength: token?.length || 0 }
        );
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(restOptions.headers || {}),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const isFormData =
        restOptions.body instanceof FormData ||
        restOptions.body instanceof Blob ||
        restOptions.body instanceof ArrayBuffer ||
        restOptions.body instanceof URLSearchParams;

      if (isFormData && headers["Content-Type"]) {
        delete headers["Content-Type"];
      }

      const body =
        restOptions.body && typeof restOptions.body === "object" && !isFormData
          ? JSON.stringify(restOptions.body)
          : restOptions.body;

      const config: RequestInit = {
        ...restOptions,
        method,
        headers,
        body,
        signal,
        ...(cache && { cache }), // Add cache option if provided
      };

      this.logDebug("Request start", {
        method,
        endpoint,
        attempt: attempt + 1,
      });

      try {
        let response = await fetch(url, config);

        if (response.status === 401 && storage) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            const refreshToken = storage.getItem("refreshToken");
            if (refreshToken) {
              try {
                const refreshResponse = await fetch(
                  `${this.baseUrl}/api/auth/refresh`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken }),
                  }
                );
                const refreshData = await refreshResponse.json();
                if (refreshData.token) {
                  storage.setItem("token", refreshData.token);
                  storage.setItem("refreshToken", refreshData.refreshToken);
                  this.processQueue(null, refreshData.token);
                  (
                    config.headers as Record<string, string>
                  ).Authorization = `Bearer ${refreshData.token}`;
                  response = await fetch(url, config);
                } else {
                  throw new Error("Falha ao renovar o token");
                }
              } catch (error) {
                this.processQueue(error, null);
                storage.clear();
                if (typeof window !== "undefined") {
                  window.location.href = "/login";
                }
                throw error;
              } finally {
                this.isRefreshing = false;
              }
            }
          } else {
            const newToken = await new Promise<string | null>(
              (resolve, reject) => {
                this.failedQueue.push({
                  resolve: (value) => resolve((value as string) ?? null),
                  reject,
                });
              }
            );
            if (newToken) {
              (
                config.headers as Record<string, string>
              ).Authorization = `Bearer ${newToken}`;
            }
            response = await fetch(url, config);
          }
        }

        if (!response.ok) {
          const errorBody = await response.text();
          this.logDebug("Request error", {
            method,
            endpoint,
            status: response.status,
            statusText: response.statusText,
            errorBody,
          });
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = (await response.json()) as T;
          this.logDebug("Request success", {
            method,
            endpoint,
            attempt: attempt + 1,
          });
          return json;
        }

        const textResponse = (await response.text()) as unknown as T;
        this.logDebug("Request success", {
          method,
          endpoint,
          attempt: attempt + 1,
        });
        return textResponse;
      } catch (error) {
        this.logDebug("Request failure", {
          method,
          endpoint,
          attempt: attempt + 1,
          error,
        });
        throw error;
      }
    };

    let attempt = 0;
    let lastError: unknown;
    while (attempt <= retries) {
      try {
        return await attemptRequest(attempt);
      } catch (error) {
        lastError = error;
        if (attempt >= retries || !this.isTransientError(error)) {
          console.error(`API request failed: ${endpoint}`, error);
          throw error;
        }
        await this.delay(300 * (attempt + 1));
        attempt += 1;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("API request failed");
  }

  public async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    return this.request<DashboardSnapshot>("/api/dashboard/today");
  }

  public async getDashboardCollections(): Promise<DashboardCollection[]> {
    const response = await this.request<{ collections: DashboardCollection[] }>(
      "/api/settings/dashboard/collections"
    );
    return response.collections || [];
  }

  public async saveDashboardCollections(
    collections: DashboardCollection[]
  ): Promise<DashboardCollection[]> {
    const response = await this.request<{ collections: DashboardCollection[] }>(
      "/api/settings/dashboard/collections",
      {
        method: "PUT",
        body: { collections },
      }
    );
    return response.collections || [];
  }

  // Brain Cloud Semantic Search
  public async semanticSearch(query: string, limit = 5): Promise<any> {
    return this.request("/api/brain/search", {
      method: "POST",
      body: { query, limit },
    });
  }

  // Brain Cloud Graph Data
  public async getGraphData(
    directory = "",
    includeOrphans = true
  ): Promise<any> {
    return this.request("/api/brain/graph", {
      method: "GET",
      searchParams: { directory, include_orphans: includeOrphans },
    });
  }

  // Brain Cloud Save Conversation
  public async saveConversation(
    conversationId: string,
    messages: any[],
    metadata = {}
  ): Promise<any> {
    return this.request("/api/brain/conversation/save", {
      method: "POST",
      body: {
        source: "claude",
        conversation_id: conversationId,
        messages,
        metadata,
      },
    });
  }

  // Brain Cloud Search Conversations
  public async searchConversations(
    query: string,
    limit = 5,
    filters = {}
  ): Promise<any> {
    return this.request("/api/brain/conversation/search", {
      method: "POST",
      body: { query, limit, filters },
    });
  }

  // Brain Cloud Get Recent Conversations
  public async getRecentConversations(limit = 10): Promise<any> {
    return this.request("/api/brain/conversations/recent?limit=" + limit);
  }

  // Brain Cloud Get Specific Conversation
  public async getBrainConversation(conversationId: string): Promise<any> {
    return this.request("/api/brain/conversation/" + conversationId);
  }

  // Settings - Brain Cloud
  public async getBrainCloudSettings(): Promise<BrainCloudSettings> {
    const response = await this.request<{
      success?: boolean;
      braincloud?: Partial<BrainCloudSettings>;
    }>("/api/settings/braincloud");
    return {
      ...defaultBrainCloudSettings,
      ...(response?.braincloud || {}),
    };
  }

  public async updateBrainCloudSettings(
    payload: BrainCloudSettings
  ): Promise<BrainCloudSettings> {
    const response = await this.request<{
      success?: boolean;
      braincloud?: Partial<BrainCloudSettings>;
    }>("/api/settings/braincloud", {
      method: "PUT",
      body: { braincloud: payload },
    });
    return {
      ...defaultBrainCloudSettings,
      ...(response?.braincloud || {}),
    };
  }

  public async testBrainCloudConnection(
    payload: BrainCloudSettings,
    mode: BrainCloudConnectionMode
  ): Promise<{
    success?: boolean;
    mode?: BrainCloudConnectionMode;
    response?: Record<string, unknown>;
    error?: string;
  }> {
    return this.request("/api/settings/braincloud/test", {
      method: "POST",
      body: {
        braincloud: payload,
        mode,
      },
    });
  }

  // Projects API
  public async getProjects(): Promise<any[]> {
    return this.request("/api/projects");
  }

  public async createProject(project: any): Promise<any> {
    return this.request("/api/projects", {
      method: "POST",
      body: project,
    });
  }

  public async updateProject(projectId: string, project: any): Promise<any> {
    return this.request(`/api/projects/${projectId}`, {
      method: "PUT",
      body: project,
    });
  }

  public async deleteProject(projectId: string): Promise<any> {
    return this.request(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  public async analyzeKnowledgeGraph(): Promise<void> {
    return this.request("/api/obsidian/analyze-graph", { method: "POST" });
  }

  async chatStream(
    messages: any[],
    sessionId: string,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
    optionsOrModelId?: string | ChatStreamOptions,
    onEvent?: (
      event:
        | { type: "thinking"; content: string }
        | { type: "content"; content: string }
        | { type: "tool_result"; data: any }
        | { type: "tool_summary"; data: any }
    ) => void
  ): Promise<void> {
    try {
      console.log(
        "[chatStream] Called with messages:",
        messages.length,
        "sessionId:",
        sessionId
      );

      let options: ChatStreamOptions = {};
      if (typeof optionsOrModelId === "string") {
        options = {
          providerOverride: {
            model: optionsOrModelId,
          },
        };
      } else if (optionsOrModelId) {
        options = optionsOrModelId;
      }

      const {
        providerOverride,
        context,
        conversationId,
        tools = true,
        projectName,
        contextNotePath,
        contextType,
      } = options;

      console.log("[chatStream] Provider override:", providerOverride);

      // Usa fetch direto para streaming
      const response = await fetch(`${this.baseUrl}/api/mcp/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          messages,
          sessionId,
          tools,
          providerOverride,
          context,
          conversationId,
          project_name: projectName,
          context_note_path: contextNotePath,
          context_type: contextType,
        }),
      });

      console.log(
        "[chatStream] Response status:",
        response.status,
        "ok:",
        response.ok
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const body = response.body as any;
      if (!body) {
        throw new Error("Failed to get response body");
      }

      const decoder = new TextDecoder();

      const processChunk = (chunk: Uint8Array | string) => {
        const text =
          typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });

        console.log("[chatStream] Raw chunk:", JSON.stringify(text.substring(0, 300)));

        const lines = text.split("\n");
        console.log("[chatStream] Split into", lines.length, "lines");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          console.log("[chatStream] Received event:", data.substring(0, 200));

          try {
            const parsed = JSON.parse(data);
            console.log("[chatStream] Parsed event type:", {
              hasToolResult: !!parsed.tool_result,
              hasToolSummary: !!parsed.tool_summary,
              type: parsed.type,
              hasChoices: !!parsed.choices,
            });

            if (parsed.tool_result) {
              onEvent?.({
                type: "tool_result",
                data: parsed.tool_result,
              });
              continue;
            }

            if (parsed.tool_summary) {
              onEvent?.({
                type: "tool_summary",
                data: parsed.tool_summary,
              });
              continue;
            }

            if (parsed.type === "text-delta") {
              if (parsed.textDelta !== undefined) {
                const textDelta =
                  typeof parsed.textDelta === "string"
                    ? parsed.textDelta
                    : JSON.stringify(parsed.textDelta, null, 2);
                console.log("[chatStream] Text delta:", textDelta.substring(0, 100));
                onEvent?.({ type: "thinking", content: textDelta });
              }
              continue;
            }

            if (parsed.type === "thinking" && parsed.content) {
              const thinkingText =
                typeof parsed.content === "string"
                  ? parsed.content
                  : JSON.stringify(parsed.content, null, 2);
              console.log(
                "[chatStream] Thinking content:",
                thinkingText.substring(0, 100)
              );
              onEvent?.({ type: "thinking", content: thinkingText });
              continue;
            }

            if (parsed.type === "error" && parsed.error) {
              throw new Error(parsed.error);
            }

            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              // DeepSeek Reasoner: reasoning_content
              if (delta.reasoning_content !== undefined) {
                const reasoningText =
                  typeof delta.reasoning_content === "string"
                    ? delta.reasoning_content
                    : JSON.stringify(delta.reasoning_content, null, 2);
                onEvent?.({
                  type: "thinking",
                  content: reasoningText,
                });
              }

              if (delta.content !== undefined) {
                const contentText =
                  typeof delta.content === "string"
                    ? delta.content
                    : JSON.stringify(delta.content, null, 2);
                console.log("[chatStream] Delta content:", contentText.substring(0, 100));
                onEvent?.({
                  type: "content",
                  content: contentText,
                });
              }
            }
          } catch (error) {
            console.error("[chatStream] Parse error:", error, "Data:", data.substring(0, 200));
            if (data && data.trim()) {
              onChunk(data);
            }
          }
        }
      };

      if (typeof body.getReader === "function") {
        const reader = body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("[chatStream] Stream done");
            break;
          }
          if (value) processChunk(value);
        }
      } else if (typeof body[Symbol.asyncIterator] === "function") {
        for await (const chunk of body) {
          if (chunk) processChunk(chunk);
        }
        console.log("[chatStream] Stream done");
      } else {
        throw new Error("Response body is not a readable stream");
      }

      onComplete();
    } catch (error) {
      console.error("Chat stream failed:", error);
      onError(error as Error);
    }
  }

  async queryCognitoStream(
    query: string,
    sessionId: string,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> {
    // Legacy method - redirect to chatStream
    const legacyMessages = [
      {
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
      },
    ];
    return this.chatStream(
      legacyMessages,
      sessionId,
      onChunk,
      onError,
      onComplete
    );
  }

  public async sendChatMessage(
    message: string,
    providerOverride?: { provider: ProviderKey; model: string }
  ): Promise<Response> {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    const token = storage?.getItem("token") ?? null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const payload: Record<string, unknown> = {
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      sessionId: `chat-${Date.now()}`,
      tools: true,
    };

    if (providerOverride) {
      payload.providerOverride = providerOverride;
    }

    const response = await fetch(`${this.baseUrl}/api/mcp/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logDebug("sendChatMessage error", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(
        errorText || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response;
  }

  // --- Métodos para Insights ---

  public async getInsights(): Promise<SynergyInsight[]> {
    const response = await this.request<{ data: SynergyInsight[] }>(
      "/api/insights"
    );
    return response.data || [];
  }

  public async refreshInsights(): Promise<SynergyInsight[]> {
    const response = await this.request<{ data: SynergyInsight[] }>(
      "/api/insights/weekly?cache=false"
    );
    return response.data || [];
  }

  public async getAIConfig(
    forceRefresh = false
  ): Promise<SettingsAIProviderConfig> {
    const cached = this.aiConfigCache;
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      this.logDebug("AI config cache hit");
      return cached.data;
    }

    const response = await this.request<{
      success?: boolean;
      config?: SettingsAIProviderConfig;
      error?: string;
      code?: string;
    }>("/api/ai/config", { retries: 1 });

    if (!response?.success || !response.config) {
      throw new Error(
        response?.error || "Falha ao carregar configuração de IA."
      );
    }

    this.setAIConfigCache(response.config);
    return response.config;
  }

  public async updateAIConfig(
    context: ModelContext | null,
    configPatch: Partial<SettingsAIProviderConfig>
  ): Promise<{ success: boolean; config?: SettingsAIProviderConfig }> {
    const selection =
      context && configPatch.modelSelection?.[context]
        ? configPatch.modelSelection[context]
        : undefined;

    const payload: Record<string, unknown> = {};

    if (selection && context) {
      payload.context = context;
      payload.selection = selection;
    }

    if (configPatch.fallbackProvider) {
      payload.fallbackProvider = configPatch.fallbackProvider;
    }

    if (Object.keys(payload).length === 0) {
      return { success: true, config: this.aiConfigCache?.data };
    }

    const response = await this.request<{
      success: boolean;
      config?: SettingsAIProviderConfig;
      error?: string;
      code?: string;
    }>("/api/ai/config", {
      method: "PATCH",
      body: payload,
      retries: 1,
    });

    if (!response.success) {
      throw new Error(
        response.error || "Falha ao atualizar configuração de IA."
      );
    }

    if (response.config) {
      this.setAIConfigCache(response.config);
    } else {
      this.aiConfigCache = null;
    }

    return response;
  }

  public async testAIProvider(
    providerOrContext: ProviderKey | ModelContext,
    options: {
      apiKey?: string;
      selection?: { provider: ProviderKey; model: string };
    } = {}
  ): Promise<{
    connected: boolean;
    error?: string;
    code?: string;
    provider?: ProviderKey;
    model?: string;
  }> {
    const payload: Record<string, unknown> = {};

    if (
      providerOrContext === "chat" ||
      providerOrContext === "insights" ||
      providerOrContext === "global"
    ) {
      payload.context = providerOrContext;
      if (options.selection) {
        payload.selection = options.selection;
      }
    } else {
      payload.provider = providerOrContext;
      if (options.apiKey) {
        payload.apiKey = options.apiKey;
      }
    }

    const response = await this.request<{
      success?: boolean;
      connected?: boolean;
      error?: string;
      code?: string;
      provider?: ProviderKey;
      model?: string;
    }>("/api/ai/config/test", {
      method: "POST",
      body: payload,
      retries: 1,
    });

    if (response?.success === false) {
      throw new Error(response.error || "Falha ao testar provedor");
    }

    return {
      connected: response?.connected ?? Boolean(response?.success),
      error: response?.error,
      code: response?.code,
      provider: response?.provider,
      model: response?.model,
    };
  }

  public async updateFallbackProvider(
    fallbackProvider: ProviderKey
  ): Promise<{ success: boolean; config?: SettingsAIProviderConfig }> {
    return this.updateAIConfig(null, { fallbackProvider });
  }

  public async updateAIModelSelection(
    context: string,
    selection: Partial<{
      provider: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
      customProviderId?: string;
    }>
  ): Promise<{ success: boolean; config?: SettingsAIProviderConfig }> {
    const normalizedContext: ModelContext =
      context === "insights" || context === "global" ? context : "chat";

    const baseConfig = await this.getAIConfig();
    type Selection = SettingsAIProviderConfig["modelSelection"][ModelContext];
    const fallbackSelection = baseConfig.modelSelection[
      normalizedContext
    ] as Selection;

    const nextSelection: Selection = {
      ...fallbackSelection,
      provider: (selection.provider ??
        fallbackSelection.provider) as ProviderKey,
      model: selection.model ?? fallbackSelection.model,
      temperature: selection.temperature ?? fallbackSelection.temperature,
      maxTokens: selection.maxTokens ?? fallbackSelection.maxTokens,
      customProviderId:
        selection.customProviderId ?? fallbackSelection.customProviderId,
    };

    return this.updateAIConfig(normalizedContext, {
      modelSelection: {
        [normalizedContext]: nextSelection,
      },
    });
  }

  public async getProviderModels(
    provider: ProviderKey,
    forceRefresh = false
  ): Promise<SettingsModelInfo[]> {
    const response = await this.request<{
      success?: boolean;
      models?: SettingsModelInfo[];
      error?: string;
      code?: string;
    }>("/api/ai/config/models", {
      method: "GET",
      searchParams: {
        provider,
        forceRefresh: forceRefresh ? "true" : undefined,
      },
      retries: 1,
      cache: "no-store", // Force fresh data, prevent HTTP 304 caching
    });

    if (response?.success === false) {
      throw new Error(
        response.error || "Falha ao carregar modelos do provedor."
      );
    }

    return response?.models ?? [];
  }

  public async refreshInsightsWithParams(params: {
    note_query?: string;
    limit?: number;
    template?: string;
    auto_save?: boolean;
    temperature?: number;
    iterations?: number;
  }): Promise<SynergyInsight[]> {
    const usp = new URLSearchParams();
    usp.set("cache", "false");
    if (params.note_query) usp.set("note_query", params.note_query);
    if (typeof params.limit === "number")
      usp.set("limit", String(params.limit));
    if (params.template) usp.set("template", params.template);
    if (typeof params.temperature === "number")
      usp.set("temperature", String(params.temperature));
    if (typeof params.iterations === "number")
      usp.set("iterations", String(params.iterations));
    if (typeof params.auto_save === "boolean")
      usp.set("auto_save", params.auto_save ? "true" : "false");
    const response = await this.request<{ data: SynergyInsight[] }>(
      `/api/insights/weekly?${usp.toString()}`
    );
    return response.data || [];
  }

  /**
   * Salva um insight como uma nota no Obsidian vault.
   * @param insight - O objeto de insight a ser salvo.
   */
  public async saveInsight(
    insight: SynergyInsight
  ): Promise<{ message: string; path: string }> {
    return this.request<{ message: string; path: string }>(
      "/api/obsidian/save-insight",
      {
        method: "POST",
        body: insight,
      }
    );
  }

  // --- Métodos para Feedback Actions ---

  public async getFeedbackActions(): Promise<FeedbackAction[]> {
    try {
      const actions = await this.request<FeedbackAction[]>(
        "/api/feedback-actions"
      );
      return actions;
    } catch (error) {
      console.error("Failed to retrieve feedback actions:", error);
      return []; // Retorna um array vazio para não quebrar a UI
    }
  }

  // --- Métodos para Agentes ---

  public async getAgents(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>("/api/agents");
    return response.data || [];
  }

  public async runAgent(agentId: string): Promise<any> {
    return this.request<any>(`/api/agents/${agentId}/run`, {
      method: "POST",
    });
  }

  public async createAgent(agentData: any): Promise<any> {
    return this.request<any>("/api/agents", {
      method: "POST",
      body: agentData,
    });
  }

  public async updateAgent(agentId: string, agentData: any): Promise<any> {
    return this.request<any>(`/api/agents/${agentId}`, {
      method: "PUT",
      body: agentData,
    });
  }

  public async deleteAgent(agentId: string): Promise<void> {
    return this.request<void>(`/api/agents/${agentId}`, {
      method: "DELETE",
    });
  }

  public async getAgentRuns(agentId: string, limit = 20): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      `/api/agents/${agentId}/runs?limit=${limit}`
    );
    return response.data || [];
  }

  public async getRuns(limit = 50): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      `/api/agents/runs?limit=${limit}`
    );
    return response.data || [];
  }

  public async getInboxNotes(limit = 15): Promise<InboxNote[]> {
    const response = await this.request<{
      data: { notes: InboxNote[] };
    }>(`/api/inbox?limit=${limit}`);
    return response.data?.notes || [];
  }

  public async getInboxNoteContent(path: string): Promise<{
    path: string;
    title: string;
    content: string;
    frontmatter?: string | null;
    rawContent?: string | null;
    modified?: string | null;
    size?: number | null;
  }> {
    const response = await this.request<{
      data: {
        path: string;
        title: string;
        content: string;
        frontmatter?: string | null;
        rawContent?: string | null;
        modified?: string | null;
        size?: number | null;
      };
    }>(`/api/inbox/content?${new URLSearchParams({ path }).toString()}`);
    return response.data;
  }

  public async getVaultNoteContent(path: string): Promise<{
    path: string;
    content: string;
    title?: string;
  }> {
    const encodedPath = encodeURIComponent(path);
    const response = await this.request<{
      data: { content: string; title?: string };
      path: string;
    }>(`/api/vault/notes/${encodedPath}`);
    return {
      path: response.path,
      content: response.data?.content || "",
      title: response.data?.title,
    };
  }

  public async toggleTaskCompletion(payload: {
    filePath: string;
    lineNumber?: number | null;
    completed: boolean;
    title?: string;
  }): Promise<{
    success: boolean;
    filePath: string;
    completed: boolean;
    updatedFrontmatter: boolean;
    adminModeExpiry?: string | null;
  }> {
    return await this.request("/api/tasks/toggle", {
      method: "POST",
      body: payload,
    });
  }

  public async getTaskPreferences(): Promise<TaskPreferences> {
    const response = await this.request<{ data: TaskPreferences }>(
      "/api/tasks/preferences"
    );
    return response.data;
  }

  public async updateTaskPreferences(
    patch: Partial<TaskPreferences> & {
      priorityMap?: Record<string, string | null | undefined>;
      boardOrder?: Record<string, string[]>;
      pinnedTaskIds?: string[];
    }
  ): Promise<TaskPreferences> {
    const response = await this.request<{ data: TaskPreferences }>(
      "/api/tasks/preferences",
      {
        method: "PATCH",
        body: patch,
      }
    );
    return response.data;
  }

  public async getCompletedTasks(
    window: string = "week"
  ): Promise<CompletedTask[]> {
    const response = await this.request<{ data: CompletedTask[] }>(
      `/api/tasks/completed?window=${encodeURIComponent(window)}`
    );
    return response.data || [];
  }

  public async triggerTaskCleanup(
    params: {
      window?: string;
    } = {}
  ): Promise<{ message: string }> {
    const response = await this.request<{
      data?: { message?: string };
    }>("/api/tasks/cleanup", {
      method: "POST",
      body: params,
    });
    const message =
      response?.data?.message ||
      "Solicitação de limpeza de tarefas enviada para o agente.";
    return { message };
  }

  public async getVaultRecentChanges(limit = 10, days = 30): Promise<any> {
    return this.request(
      `/api/vault/recent-changes?limit=${limit}&days=${days}`
    );
  }

  public async getObcStatus(): Promise<any> {
    return this.request("/api/vault/obc/status");
  }

  public async getKnowledgeGraphNodes(
    params: { type?: string; limit?: number; search?: string } = {}
  ): Promise<any[]> {
    const usp = new URLSearchParams();
    if (params.type && params.type !== "all") usp.set("type", params.type);
    if (typeof params.limit === "number")
      usp.set("limit", String(params.limit));
    if (params.search) usp.set("search", params.search);
    const query = usp.toString();
    const response = await this.request(
      `/api/knowledge-graph/nodes${query ? `?${query}` : ""}`
    );
    return Array.isArray(response) ? response : [];
  }

  public async getDecisions(): Promise<any[]> {
    const response = await this.request<any[]>("/api/decisions");
    return Array.isArray(response) ? response : [];
  }

  public async createDecision(payload: Record<string, any>): Promise<any> {
    return this.request("/api/decisions", {
      method: "POST",
      body: payload,
    });
  }

  public async getSessions(
    params: { status?: string; type?: string; limit?: number } = {}
  ): Promise<any[]> {
    const usp = new URLSearchParams();
    if (params.status && params.status !== "all")
      usp.set("status", params.status);
    if (params.type && params.type !== "all") usp.set("type", params.type);
    if (typeof params.limit === "number")
      usp.set("limit", String(params.limit));
    const query = usp.toString();
    const response = await this.request<any[]>(
      `/api/sessions${query ? `?${query}` : ""}`
    );
    return Array.isArray(response) ? response : [];
  }

  public async createSession(payload: Record<string, any>): Promise<any> {
    return this.request("/api/sessions", {
      method: "POST",
      body: payload,
    });
  }

  public async updateSession(
    id: string,
    payload: Record<string, any>
  ): Promise<any> {
    return this.request(`/api/sessions/${id}`, {
      method: "PUT",
      body: payload,
    });
  }

  public async deleteSession(id: string): Promise<void> {
    await this.request(`/api/sessions/${id}`, {
      method: "DELETE",
    });
  }

  public async scheduleSession(id: string, date: string): Promise<any> {
    return this.request(`/api/sessions/${id}/schedule`, {
      method: "POST",
      body: { date },
    });
  }

  public async generateAISessions(payload: Record<string, any>): Promise<any> {
    return this.request("/api/sessions/generate", {
      method: "POST",
      body: payload,
    });
  }
  // --- Métodos para Market Intelligence ---

  public async getMarketOpportunities(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      "/api/market-intelligence/opportunities"
    );
    return response.data || [];
  }

  public async getCompetitorInsights(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      "/api/market-intelligence/competitors"
    );
    return response.data || [];
  }

  // --- Métodos para Provedores ---

  public async listModels(provider: string, apiKey: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      "/api/providers/list-models",
      {
        method: "POST",
        body: { provider, apiKey },
      }
    );
    return response.data || [];
  }

  // --- Métodos para Vault ---

  public async getVaultStats(): Promise<any> {
    return this.request("/api/vault/stats");
  }

  public async syncVault(
    direction: "pull" | "push" = "pull",
    message?: string
  ): Promise<any> {
    return this.request("/api/vault/sync", {
      method: "POST",
      body: { direction, message },
    });
  }

  public async searchVaultNotes(
    query?: string,
    folder?: string,
    limit?: number,
    withContent?: boolean
  ): Promise<any> {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (folder) params.append("folder", folder);
    if (limit) params.append("limit", limit.toString());
    if (withContent) params.append("withContent", "true");

    return this.request(`/api/vault/notes?${params.toString()}`);
  }

  public async getVaultNote(notePath: string): Promise<any> {
    return this.request(`/api/vault/notes/${encodeURIComponent(notePath)}`);
  }

  public async createVaultNote(
    title: string,
    content: string,
    folder?: string
  ): Promise<any> {
    return this.request("/api/vault/notes", {
      method: "POST",
      body: { title, content, folder },
    });
  }

  // --- Métodos para Feedback Actions ---

  public async createFeedbackAction(actionData: {
    type: string;
    title: string;
    description: string;
    obsidianNote?: string;
    relatedProject?: string;
    impact?: string;
  }): Promise<any> {
    return this.request("/api/feedback-actions", {
      method: "POST",
      body: actionData,
    });
  }

  public async updateFeedbackActionStatus(
    actionId: string,
    status: string
  ): Promise<any> {
    return this.request(`/api/feedback-actions/${actionId}`, {
      method: "PUT",
      body: { status },
    });
  }

  // --- Métodos para Conversações ---

  /**
   * Get all conversations for the current user
   */
  public async getConversations(options?: {
    limit?: number;
    offset?: number;
    contextType?: "global" | "project" | "note";
  }): Promise<{ conversations: Conversation[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.contextType) params.append("contextType", options.contextType);

    const response = await this.request<{
      conversations: Conversation[];
      total: number;
    }>(`/api/conversations?${params.toString()}`);
    return response;
  }

  /**
   * Get conversation statistics
   */
  public async getConversationStats(): Promise<ConversationStats> {
    const response = await this.request<ConversationStats>(
      "/api/conversations/stats"
    );
    return response;
  }

  /**
   * Get a single conversation with all messages
   */
  public async getConversation(conversationId: string): Promise<Conversation> {
    const response = await this.request<Conversation>(
      `/api/conversations/${conversationId}`
    );
    return response;
  }

  /**
   * Create a new conversation
   */
  public async createConversation(
    payload: ConversationCreatePayload
  ): Promise<Conversation> {
    const response = await this.request<Conversation>("/api/conversations", {
      method: "POST",
      body: payload,
    });
    return response;
  }

  /**
   * Add a message to a conversation
   */
  public async addMessage(
    conversationId: string,
    message: {
      role: "user" | "assistant";
      content: string;
      contextSnapshot?: Record<string, unknown>;
    }
  ): Promise<ChatMessage> {
    const response = await this.request<ConversationMessageResponse>(
      `/api/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: message,
      }
    );
    return mapChatMessage(response);
  }

  /**
   * Request an assistant response for the given conversation
   */
  public async respondToConversation(
    conversationId: string,
    payload?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      modelId?: string;
    }
  ): Promise<ConversationResponsePayload> {
    const response = await this.request<ConversationResponseApiResponse>(
      `/api/conversations/${conversationId}/respond`,
      {
        method: "POST",
        body: payload ?? {},
      }
    );

    return {
      ...response,
      message: mapChatMessage(response.message),
    };
  }

  /**
   * Update conversation title
   */
  public async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<Conversation> {
    const response = await this.request<Conversation>(
      `/api/conversations/${conversationId}/title`,
      {
        method: "PATCH",
        body: { title },
      }
    );
    return response;
  }

  /**
   * Generate conversation title using AI
   */
  public async generateConversationTitle(
    conversationId: string
  ): Promise<{ title: string }> {
    const response = await this.request<{ title: string }>(
      `/api/conversations/${conversationId}/generate-title`,
      {
        method: "POST",
      }
    );
    return response;
  }

  /**
   * Delete a conversation
   */
  public async deleteConversation(
    conversationId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{
      success: boolean;
      message: string;
    }>(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });
    return response;
  }

  /**
   * Update detected tags in conversation
   */
  public async updateConversationTags(
    conversationId: string,
    tags: string[]
  ): Promise<Conversation> {
    const response = await this.request<Conversation>(
      `/api/conversations/${conversationId}/tags`,
      {
        method: "PATCH",
        body: { tags },
      }
    );
    return response;
  }

  // ==================== AI Providers ====================

  /**
   * Get all AI providers for the current user
   */
  public async getAIProviders(): Promise<{ providers: AIProvider[] }> {
    const response = await this.request<{ providers: AIProviderResponse[] }>(
      "/api/ai-providers",
      {
        method: "GET",
      }
    );
    return {
      providers: (response.providers || []).map(mapAIProvider),
    };
  }

  /**
   * Create or update an AI provider
   */
  public async upsertAIProvider(
    payload: AIProviderCreatePayload
  ): Promise<AIProvider> {
    const response = await this.request<AIProviderResponse>(
      "/api/ai-providers",
      {
        method: "POST",
        body: payload,
      }
    );
    return mapAIProvider(response);
  }

  /**
   * Delete an AI provider
   */
  public async deleteAIProvider(
    providerId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{
      success: boolean;
      message: string;
    }>(`/api/ai-providers/${providerId}`, {
      method: "DELETE",
    });
    return response;
  }

  /**
   * Get all models for a specific provider (by internal ID)
   */
  public async getProviderModelsById(
    providerId: string
  ): Promise<{ models: AIModel[] }> {
    const response = await this.request<{ models: AIModelResponse[] }>(
      `/api/ai-providers/${providerId}/models`,
      {
        method: "GET",
      }
    );
    return {
      models: (response.models || []).map(mapAIModel),
    };
  }

  /**
   * Synchronize models from provider API
   */
  public async syncProviderModels(
    providerId: string
  ): Promise<{ models: AIModel[] }> {
    const response = await this.request<{ models: AIModelResponse[] }>(
      `/api/ai-providers/${providerId}/models/sync`,
      {
        method: "POST",
      }
    );

    return {
      models: (response.models || []).map(mapAIModel),
    };
  }

  /**
   * Get all available models across all active providers
   */
  public async getAvailableModels(): Promise<{ models: AIModel[] }> {
    const response = await this.request<{ models: AIModelResponse[] }>(
      "/api/ai-providers/models/available",
      {
        method: "GET",
      }
    );
    return {
      models: (response.models || []).map(mapAIModel),
    };
  }

  /**
   * Add or update a model for a provider
   */
  public async upsertModel(
    providerId: string,
    payload: AIModelCreatePayload
  ): Promise<AIModel> {
    const response = await this.request<AIModelResponse>(
      `/api/ai-providers/${providerId}/models`,
      {
        method: "POST",
        body: payload,
      }
    );
    return mapAIModel(response);
  }

  /**
   * Set model configuration for a conversation
   */
  public async setConversationModel(
    conversationId: string,
    modelId: string,
    parameters?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    }
  ): Promise<ConversationModelConfig> {
    const response = await this.request<ConversationModelConfigResponse>(
      `/api/ai-providers/conversations/${conversationId}/model`,
      {
        method: "POST",
        body: { modelId, ...parameters },
      }
    );
    return mapConversationModelConfig(response);
  }

  /**
   * Get model configuration for a conversation
   */
  public async getConversationModel(
    conversationId: string
  ): Promise<ConversationModelConfig | null> {
    const response = await this.request<ConversationModelConfigResponse | null>(
      `/api/ai-providers/conversations/${conversationId}/model`,
      {
        method: "GET",
      }
    );
    return response ? mapConversationModelConfig(response) : null;
  }

  public async getCurrentUser(): Promise<CurrentUserProfile> {
    const response = await this.request<{
      success?: boolean;
      user: CurrentUserProfile;
    }>("/api/auth/me");
    return response.user;
  }

  public async logout(): Promise<void> {
    this.clearAIConfigCache();
    await this.request<{ success?: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  }
}

export default new APIClient();
