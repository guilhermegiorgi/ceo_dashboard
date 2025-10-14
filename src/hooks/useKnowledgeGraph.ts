import { useCallback, useEffect, useState } from "react";
import { useAPI } from "./useAPI";

export interface KnowledgeGraphNode {
  id: string;
  title: string;
  type: string;
  content: string;
  connections: string[];
  tags: string[];
  last_modified?: string;
  importance?: number;
  x?: number;
  y?: number;
}

export interface KnowledgeGraphAnalysis {
  totalNodes?: number;
  nodeTypes?: Record<string, number>;
  topTags?: Array<[string, number]>;
  connectionPatterns?: Array<Record<string, unknown>>;
  insights?: Array<Record<string, unknown>>;
  potentialConnections?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export const useKnowledgeGraph = () => {
  const api = useAPI();
  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.request<KnowledgeGraphNode[]>(
        "/api/knowledge-graph/nodes"
      );
      setNodes(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const analyzeGraph = useCallback(async () => {
    const analysis = await api.request<KnowledgeGraphAnalysis>(
      "/api/knowledge-graph/analyze",
      {
        method: "POST",
      }
    );

    // Refresh nodes after analysis to capture any updates the backend might add
    fetchNodes();
    return analysis;
  }, [api, fetchNodes]);

  return {
    nodes,
    loading,
    error,
    refresh: fetchNodes,
    analyzeGraph,
  };
};
