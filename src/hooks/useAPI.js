import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient.js';

export function useAPI() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect WebSocket on mount
    apiClient.connectWebSocket();
    
    // Check connection status
    const checkConnection = async () => {
      try {
        await apiClient.request('/health');
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setIsConnected(false);
        setError(err.message);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      apiClient.disconnectWebSocket();
    };
  }, []);

  return {
    apiClient,
    isConnected,
    error
  };
}

export function useInsights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.request('/api/insights');
      setInsights(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateInsights = useCallback(async (context) => {
    try {
      const result = await apiClient.request('/api/insights/generate', {
        method: 'POST',
        body: { context }
      });
      await fetchInsights(); // Refresh insights list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchInsights]);

  const createActionPlan = useCallback(async (insightId, actionPlan) => {
    try {
      const result = await apiClient.request(`/api/insights/${insightId}/action-plan`, {
        method: 'POST',
        body: actionPlan
      });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchInsights();

    // Listen for new insights from WebSocket
    const handleNewInsights = (event) => {
      setInsights(prev => [...event.detail, ...prev]);
    };

    window.addEventListener('newInsights', handleNewInsights);
    return () => window.removeEventListener('newInsights', handleNewInsights);
  }, [fetchInsights]);

  return {
    insights,
    loading,
    error,
    fetchInsights,
    generateInsights,
    createActionPlan
  };
}

export function useObsidian() {
  const [vaultInfo, setVaultInfo] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVaultInfo = useCallback(async () => {
    try {
      const data = await apiClient.request('/api/obsidian/vault');
      setVaultInfo(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch vault info:', err);
    }
  }, []);

  const fetchRecentNotes = useCallback(async (limit = 10) => {
    try {
      const data = await apiClient.request(`/api/obsidian/recent?limit=${limit}`);
      setRecentNotes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch recent notes:', err);
    }
  }, []);

  const searchNotes = useCallback(async (query, limit = 10) => {
    try {
      return await apiClient.request(`/api/obsidian/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const createNote = useCallback(async (title, content, folder = '') => {
    try {
      const result = await apiClient.request('/api/obsidian/note', {
        method: 'POST',
        body: { title, content, folder }
      });
      await fetchRecentNotes(); // Refresh recent notes
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchRecentNotes]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchVaultInfo(),
        fetchRecentNotes()
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchVaultInfo, fetchRecentNotes]);

  return {
    vaultInfo,
    recentNotes,
    loading,
    error,
    searchNotes,
    createNote,
    fetchRecentNotes
  };
}

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.request('/api/projects');
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (project) => {
    try {
      const result = await apiClient.request('/api/projects', {
        method: 'POST',
        body: project
      });
      await fetchProjects(); // Refresh projects list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (projectId, updates) => {
    try {
      const result = await apiClient.request(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: updates
      });
      await fetchProjects(); // Refresh projects list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();

    // Listen for project updates from WebSocket
    const handleProjectUpdate = (event) => {
      setProjects(prev => 
        prev.map(project => 
          project.id === event.detail.id ? { ...project, ...event.detail } : project
        )
      );
    };

    window.addEventListener('projectUpdated', handleProjectUpdate);
    return () => window.removeEventListener('projectUpdated', handleProjectUpdate);
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject
  };
}

export function useKnowledgeGraph() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNodes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.request('/api/knowledge-graph/nodes');
      setNodes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch knowledge nodes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeGraph = useCallback(async () => {
    try {
      const result = await apiClient.request('/api/knowledge-graph/analyze', {
        method: 'POST'
      });
      await fetchNodes(); // Refresh nodes after analysis
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchNodes]);

  useEffect(() => {
    fetchNodes();

    // Listen for knowledge graph updates from WebSocket
    const handleGraphUpdate = () => {
      fetchNodes();
    };

    window.addEventListener('knowledgeGraphUpdated', handleGraphUpdate);
    return () => window.removeEventListener('knowledgeGraphUpdated', handleGraphUpdate);
  }, [fetchNodes]);

  return {
    nodes,
    loading,
    error,
    fetchNodes,
    analyzeGraph
  };
}

export function useMCP() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.request('/api/mcp/services');
      setServices(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch MCP services:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const queryService = useCallback(async (serviceId, query, context = {}) => {
    try {
      const result = await apiClient.request(`/api/mcp/services/${serviceId}/query`, {
        method: 'POST',
        body: { query, context }
      });
      await fetchServices(); // Refresh services to update stats
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchServices]);

  const queryAllServices = useCallback(async (query, context = {}) => {
    try {
      const result = await apiClient.request('/api/mcp/query-all', {
        method: 'POST',
        body: { query, context }
      });
      await fetchServices(); // Refresh services to update stats
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchServices]);

  useEffect(() => {
    fetchServices();
    
    // Refresh services every 30 seconds
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    fetchServices,
    queryService,
    queryAllServices
  };
}

export function useDecisions() {
  const [decisions, setDecisions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDecisions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.request('/api/decisions');
      setDecisions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch decisions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await apiClient.request('/api/decisions/analytics');
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch decision analytics:', err);
    }
  }, []);

  const createDecision = useCallback(async (decision) => {
    try {
      const result = await apiClient.request('/api/decisions', {
        method: 'POST',
        body: decision
      });
      await fetchDecisions();
      await fetchAnalytics();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchDecisions, fetchAnalytics]);

  const updateDecision = useCallback(async (decisionId, updates) => {
    try {
      const result = await apiClient.request(`/api/decisions/${decisionId}`, {
        method: 'PUT',
        body: updates
      });
      await fetchDecisions();
      await fetchAnalytics();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchDecisions, fetchAnalytics]);

  useEffect(() => {
    fetchDecisions();
    fetchAnalytics();
  }, [fetchDecisions, fetchAnalytics]);

  return {
    decisions,
    analytics,
    loading,
    error,
    fetchDecisions,
    createDecision,
    updateDecision
  };
}

export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.request('/api/sessions');
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (session) => {
    try {
      const result = await apiClient.request('/api/sessions', {
        method: 'POST',
        body: session
      });
      await fetchSessions();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchSessions]);

  const scheduleSession = useCallback(async (sessionId, date) => {
    try {
      const result = await apiClient.request(`/api/sessions/${sessionId}/schedule`, {
        method: 'POST',
        body: { date }
      });
      await fetchSessions();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchSessions]);

  const generateAISessions = useCallback(async (insights) => {
    try {
      const result = await apiClient.request('/api/sessions/generate', {
        method: 'POST',
        body: { insights }
      });
      await fetchSessions();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    scheduleSession,
    generateAISessions
  };
}