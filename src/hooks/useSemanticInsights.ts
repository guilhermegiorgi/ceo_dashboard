/**
 * useSemanticInsights Hook
 * Gerencia busca e estado de insights semânticos via Brain Cloud
 * Extraído de BusinessIntelligenceHub para decomposição Phase 4
 */

import { useCallback, useState } from "react";

export interface SemanticInsight {
  id: string;
  title: string;
  description: string;
  tags: string[];
  confidence: number;
  source: string;
  timestamp: string;
  relatedItems?: Array<{
    type: "note" | "task" | "project";
    id: string;
    title: string;
  }>;
}

export function useSemanticInsights() {
  const [semanticInsights, setSemanticInsights] = useState<SemanticInsight[]>(
    []
  );
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticError, setSemanticError] = useState<string | null>(null);
  const [lastSemanticQuery, setLastSemanticQuery] = useState<string | null>(
    null
  );

  /**
   * Fetch semantic insights from Brain Cloud
   */
  const fetchSemanticInsights = useCallback(
    async (query: string, abortSignal?: AbortSignal) => {
      if (!query || query.trim().length === 0) {
        setSemanticInsights([]);
        setLastSemanticQuery(null);
        return;
      }

      try {
        setSemanticLoading(true);
        setSemanticError(null);
        setLastSemanticQuery(query);

        const response = await fetch("/api/brain/context", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 5,
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch insights: ${response.statusText}`);
        }

        const data = await response.json();
        const insights: SemanticInsight[] = (data.results || []).map(
          (item: Record<string, unknown>, idx: number) => ({
            id: String(item.id || `insight-${idx}`),
            title: String(item.title || "Untitled insight"),
            description: String(item.snippet || item.description || ""),
            tags: Array.isArray(item.tags) ? item.tags : [],
            confidence:
              typeof item.score === "number"
                ? Math.min(1, Math.max(0, item.score))
                : 0.5,
            source: String(item.source || "Brain Cloud"),
            timestamp: String(item.timestamp || new Date().toISOString()),
            relatedItems: Array.isArray(item.relatedItems)
              ? item.relatedItems
              : [],
          })
        );

        setSemanticInsights(insights);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setSemanticError(error.message);
        }
        setSemanticInsights([]);
      } finally {
        setSemanticLoading(false);
      }
    },
    []
  );

  /**
   * Clear semantic insights
   */
  const clearSemanticInsights = useCallback(() => {
    setSemanticInsights([]);
    setSemanticError(null);
    setLastSemanticQuery(null);
  }, []);

  /**
   * Retry last query
   */
  const retrySemanticSearch = useCallback(async () => {
    if (lastSemanticQuery) {
      await fetchSemanticInsights(lastSemanticQuery);
    }
  }, [lastSemanticQuery, fetchSemanticInsights]);

  return {
    insights: semanticInsights,
    setInsights: setSemanticInsights,
    loading: semanticLoading,
    setLoading: setSemanticLoading,
    error: semanticError,
    setError: setSemanticError,
    lastQuery: lastSemanticQuery,
    fetchInsights: fetchSemanticInsights,
    clearInsights: clearSemanticInsights,
    retry: retrySemanticSearch,
  };
}
