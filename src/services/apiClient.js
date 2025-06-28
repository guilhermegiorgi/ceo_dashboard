class APIClient {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Obsidian API methods
  async getVaultInfo() {
    return this.request('/api/obsidian/vault');
  }

  async searchNotes(query, limit = 10) {
    return this.request(`/api/obsidian/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getNoteContent(notePath) {
    return this.request(`/api/obsidian/note/${encodeURIComponent(notePath)}`);
  }

  async createNote(title, content, folder = '') {
    return this.request('/api/obsidian/note', {
      method: 'POST',
      body: { title, content, folder }
    });
  }

  async updateNote(notePath, content) {
    return this.request(`/api/obsidian/note/${encodeURIComponent(notePath)}`, {
      method: 'PUT',
      body: { content }
    });
  }

  async getRecentNotes(limit = 10) {
    return this.request(`/api/obsidian/recent?limit=${limit}`);
  }

  // Insights API methods
  async getInsights() {
    return this.request('/api/insights');
  }

  async generateInsights(context) {
    return this.request('/api/insights/generate', {
      method: 'POST',
      body: { context }
    });
  }

  async createActionPlan(insightId, actionPlan) {
    return this.request(`/api/insights/${insightId}/action-plan`, {
      method: 'POST',
      body: actionPlan
    });
  }

  async getInsightDetails(insightId) {
    return this.request(`/api/insights/${insightId}/details`);
  }

  // Projects API methods
  async getProjects() {
    return this.request('/api/projects');
  }

  async createProject(project) {
    return this.request('/api/projects', {
      method: 'POST',
      body: project
    });
  }

  async updateProject(projectId, updates) {
    return this.request(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: updates
    });
  }

  // Decisions API methods
  async getDecisions() {
    return this.request('/api/decisions');
  }

  async createDecision(decision) {
    return this.request('/api/decisions', {
      method: 'POST',
      body: decision
    });
  }

  async updateDecision(decisionId, updates) {
    return this.request(`/api/decisions/${decisionId}`, {
      method: 'PUT',
      body: updates
    });
  }

  // Strategic Sessions API methods
  async getSessions() {
    return this.request('/api/sessions');
  }

  async createSession(session) {
    return this.request('/api/sessions', {
      method: 'POST',
      body: session
    });
  }

  async scheduleSession(sessionId, date) {
    return this.request(`/api/sessions/${sessionId}/schedule`, {
      method: 'POST',
      body: { date }
    });
  }

  // Knowledge Graph API methods
  async getKnowledgeNodes() {
    return this.request('/api/knowledge-graph/nodes');
  }

  async analyzeKnowledgeGraph() {
    return this.request('/api/knowledge-graph/analyze', {
      method: 'POST'
    });
  }

  // WebSocket methods
  connectWebSocket() {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
    
    try {
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max WebSocket reconnection attempts reached');
    }
  }

  handleWebSocketMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'new_insights':
        // Dispatch custom event for new insights
        window.dispatchEvent(new CustomEvent('newInsights', { detail: data }));
        break;
        
      case 'knowledge_graph_updated':
        window.dispatchEvent(new CustomEvent('knowledgeGraphUpdated', { detail: data }));
        break;
        
      case 'project_updated':
        window.dispatchEvent(new CustomEvent('projectUpdated', { detail: data }));
        break;
        
      default:
        console.log('Unhandled WebSocket message:', message);
    }
  }

  sendWebSocketMessage(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  subscribeToStream(stream) {
    this.sendWebSocketMessage({
      type: 'subscribe',
      data: { stream }
    });
  }

  unsubscribeFromStream(stream) {
    this.sendWebSocketMessage({
      type: 'unsubscribe',
      data: { stream }
    });
  }

  disconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

export default new APIClient();