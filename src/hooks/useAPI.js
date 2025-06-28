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
      const data = await apiClient.getInsights();
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
      const result = await apiClient.generateInsights(context);
      await fetchInsights(); // Refresh insights list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchInsights]);

  const createActionPlan = useCallback(async (insightId, actionPlan) => {
    try {
      const result = await apiClient.createActionPlan(insightId, actionPlan);
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
      const data = await apiClient.getVaultInfo();
      setVaultInfo(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch vault info:', err);
    }
  }, []);

  const fetchRecentNotes = useCallback(async (limit = 10) => {
    try {
      const data = await apiClient.getRecentNotes(limit);
      setRecentNotes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch recent notes:', err);
    }
  }, []);

  const searchNotes = useCallback(async (query, limit = 10) => {
    try {
      return await apiClient.searchNotes(query, limit);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const createNote = useCallback(async (title, content, folder = '') => {
    try {
      const result = await apiClient.createNote(title, content, folder);
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
      const data = await apiClient.getProjects();
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
      const result = await apiClient.createProject(project);
      await fetchProjects(); // Refresh projects list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (projectId, updates) => {
    try {
      const result = await apiClient.updateProject(projectId, updates);
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
      const data = await apiClient.getKnowledgeNodes();
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
      const result = await apiClient.analyzeKnowledgeGraph();
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