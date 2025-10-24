"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type {
  DashboardSnapshot,
  DashboardCollection,
  TaskPreferences,
} from "../services/apiClient";
import { useAPI } from "../hooks/useAPI";

interface DashboardDataContextType {
  // Data states
  snapshot: DashboardSnapshot | null;
  collections: DashboardCollection[];
  taskPreferences: TaskPreferences | null;
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  collectionsLoading: boolean;
  
  // Actions
  loadSnapshot: (options?: { silent?: boolean }) => Promise<void>;
  refreshSnapshot: () => Promise<void>;
  getTaskPreferences: () => Promise<TaskPreferences | null>;
  getDashboardCollections: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | null>(
  null
);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const api = useAPI();
  
  // States
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [collections, setCollections] = useState<DashboardCollection[]>([]);
  const [taskPreferences, setTaskPreferences] = useState<TaskPreferences | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  // Load snapshot function
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

  // Refresh snapshot alias
  const refreshSnapshot = useCallback(async () => {
    await loadSnapshot({ silent: true });
  }, [loadSnapshot]);

  // Get task preferences
  const getTaskPreferences = useCallback(async (): Promise<TaskPreferences | null> => {
    try {
      const prefs = await api.getTaskPreferences();
      setTaskPreferences(prefs);
      return prefs;
    } catch (error) {
      console.error("Failed to load task preferences", error);
      return null;
    }
  }, [api]);

  // Get dashboard collections
  const getDashboardCollections = useCallback(async () => {
    let mounted = true;
    try {
      setCollectionsLoading(true);
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
    return () => {
      mounted = false;
    };
  }, [api]);

  // Initial data loading - only run once on mount
  useEffect(() => {
    loadSnapshot();
    getDashboardCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps array - only run on mount

  const value: DashboardDataContextType = {
    // Data
    snapshot,
    collections,
    taskPreferences,
    
    // Loading states
    loading,
    refreshing,
    error,
    collectionsLoading,
    
    // Actions
    loadSnapshot,
    refreshSnapshot,
    getTaskPreferences,
    getDashboardCollections,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return context;
}
