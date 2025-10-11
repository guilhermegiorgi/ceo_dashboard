// src/services/apiClient.ts

// --- Interfaces de Tipos ---

export interface FeedbackAction {
  id: string;
  type: 'decision' | 'insight_validation' | 'action_taken' | 'learning_captured';
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  obsidianNote?: string;
  relatedProject?: string;
  impact?: string;
}

export interface SynergyInsight {
  id: string;
  type: 'unexpected_connection' | 'knowledge_gap' | 'success_pattern' | 'strategic_question';
  title: string;
  description: string;
  confidence: number;
  urgency: 'high' | 'medium' | 'low';
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
  };
  warnings?: Array<{ scope?: string; message: string }>;
  config?: {
    restEnabled: boolean;
    mcpEnabled: boolean;
    baseUrl?: string;
    tenantId?: string | null;
  };
}

// --- Cliente da API ---

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

export class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  private isRefreshing = false;
  private failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

  private processQueue = (error: any, token = null) => {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  };

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let token = localStorage.getItem('token');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      let response = await fetch(url, config);
      
      if (response.status === 401) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const refreshResponse = await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken }),
              });
              const refreshData = await refreshResponse.json();
              if (refreshData.token) {
                localStorage.setItem('token', refreshData.token);
                localStorage.setItem('refreshToken', refreshData.refreshToken);
                this.processQueue(null, refreshData.token);
                // Repete a requisição original com o novo token
                (config.headers as Record<string, string>)['Authorization'] = `Bearer ${refreshData.token}`;
                response = await fetch(url, config);
              } else {
                throw new Error('Falha ao renovar o token');
              }
            } catch (e) {
              this.processQueue(e, null);
              localStorage.clear();
              window.location.href = '/login';
              throw e;
            } finally {
              this.isRefreshing = false;
            }
          }
        } else {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }).then(newToken => {
            (config.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
            return fetch(url, config);
          }).then(res => res.json());
        }
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`HTTP ${response.status}: ${response.statusText}`, errorBody);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json() as T;
      }
      
      // Retorna como texto se não for JSON
      const textResponse = await response.text();
      return textResponse as unknown as T;

    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  public async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    return this.request<DashboardSnapshot>('/api/dashboard/today');
  }

  async queryCognitoStream(
    query: string,
    sessionId: string,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/mcp/query-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ query, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value);
        onChunk(chunk);
      }

      onComplete();
    } catch (error) {
      console.error('Streaming API request failed:', error);
      onError(error as Error);
    }
  }

  // --- Métodos para Insights ---

  public async getInsights(): Promise<SynergyInsight[]> {
    const response = await this.request<{ data: SynergyInsight[] }>('/api/insights');
    return response.data || [];
  }

  public async refreshInsights(): Promise<SynergyInsight[]> {
    const response = await this.request<{ data: SynergyInsight[] }>('/api/insights/weekly?cache=false');
    return response.data || [];
  }

  public async refreshInsightsWithParams(params: { note_query?: string; limit?: number; template?: string; auto_save?: boolean; temperature?: number; iterations?: number }): Promise<SynergyInsight[]> {
    const usp = new URLSearchParams();
    usp.set('cache','false');
    if (params.note_query) usp.set('note_query', params.note_query);
    if (typeof params.limit === 'number') usp.set('limit', String(params.limit));
    if (params.template) usp.set('template', params.template);
    if (typeof params.temperature === 'number') usp.set('temperature', String(params.temperature));
    if (typeof params.iterations === 'number') usp.set('iterations', String(params.iterations));
    if (typeof params.auto_save === 'boolean') usp.set('auto_save', params.auto_save ? 'true' : 'false');
    const response = await this.request<{ data: SynergyInsight[] }>(`/api/insights/weekly?${usp.toString()}`);
    return response.data || [];
  }

  /**
   * Salva um insight como uma nota no Obsidian vault.
   * @param insight - O objeto de insight a ser salvo.
   */
  public async saveInsight(insight: SynergyInsight): Promise<{ message: string; path: string }> {
    return this.request<{ message: string; path: string }>('/api/obsidian/save-insight', {
      method: 'POST',
      body: insight,
    });
  }

  // --- Métodos para Feedback Actions ---

  public async getFeedbackActions(): Promise<FeedbackAction[]> {
    try {
      const actions = await this.request<FeedbackAction[]>('/api/feedback-actions');
      return actions;
    } catch (error) {
      console.error('Failed to retrieve feedback actions:', error);
      return []; // Retorna um array vazio para não quebrar a UI
    }
  }

  // --- Métodos para Agentes ---

  public async getAgents(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>('/api/agents');
    return response.data || [];
  }

  public async runAgent(agentId: string): Promise<any> {
    return this.request<any>(`/api/agents/${agentId}/run`, {
      method: 'POST',
    });
  }

  public async createAgent(agentData: any): Promise<any> {
    return this.request<any>('/api/agents', {
      method: 'POST',
      body: agentData,
    });
  }

  public async updateAgent(agentId: string, agentData: any): Promise<any> {
    return this.request<any>(`/api/agents/${agentId}`, {
      method: 'PUT',
      body: agentData,
    });
  }

  public async deleteAgent(agentId: string): Promise<void> {
    return this.request<void>(`/api/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  public async getAgentRuns(agentId: string, limit = 20): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(`/api/agents/${agentId}/runs?limit=${limit}`);
    return response.data || [];
  }

  public async getRuns(limit = 50): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(`/api/agents/runs?limit=${limit}`);
    return response.data || [];
  }

  // --- Métodos para Market Intelligence ---

  public async getMarketOpportunities(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>('/api/market-intelligence/opportunities');
    return response.data || [];
  }

  public async getCompetitorInsights(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>('/api/market-intelligence/competitors');
    return response.data || [];
  }

  // --- Métodos para Provedores ---

  public async listModels(provider: string, apiKey: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>('/api/providers/list-models', {
      method: 'POST',
      body: { provider, apiKey },
    });
    return response.data || [];
  }

  // --- Métodos para Vault ---

  public async getVaultStats(): Promise<any> {
    return this.request('/api/vault/stats');
  }

  public async syncVault(direction: 'pull' | 'push' = 'pull', message?: string): Promise<any> {
    return this.request('/api/vault/sync', {
      method: 'POST',
      body: { direction, message }
    });
  }

  public async searchVaultNotes(query?: string, folder?: string, limit?: number, withContent?: boolean): Promise<any> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (folder) params.append('folder', folder);
    if (limit) params.append('limit', limit.toString());
    if (withContent) params.append('withContent', 'true');

    return this.request(`/api/vault/notes?${params.toString()}`);
  }

  public async getVaultNote(notePath: string): Promise<any> {
    return this.request(`/api/vault/notes/${encodeURIComponent(notePath)}`);
  }

  public async createVaultNote(title: string, content: string, folder?: string): Promise<any> {
    return this.request('/api/vault/notes', {
      method: 'POST',
      body: { title, content, folder }
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
    return this.request('/api/feedback-actions', {
      method: 'POST',
      body: actionData
    });
  }

  public async updateFeedbackActionStatus(actionId: string, status: string): Promise<any> {
    return this.request(`/api/feedback-actions/${actionId}`, {
      method: 'PUT',
      body: { status }
    });
  }
}

export default new APIClient();
