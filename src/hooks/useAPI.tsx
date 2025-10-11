import React, { createContext, useContext } from 'react';
import apiClient, { APIClient } from '../services/apiClient';

const APIContext = createContext<APIClient | null>(null);

export const APIProvider = ({ children }: { children: React.ReactNode }) => (
  <APIContext.Provider value={apiClient}>
    {children}
  </APIContext.Provider>
);

export const useAPI = () => {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
};

// --- Specific Hooks & Types --- //

export interface Insight {
  id: string;
  title: string;
  summary: string;
  date: string;
  type: 'data' | 'event' | 'observation';
}

export const useInsights = () => useAPI<Insight[]>('/api/insights');
export const useObsidian = () => useAPI<any>('/api/obsidian');
export const useProjects = () => useAPI<any[]>('/api/projects');
export const useKnowledgeGraph = () => useAPI<any>('/api/knowledge-graph');
export const useMCP = () => useAPI<any>('/api/mcp');
