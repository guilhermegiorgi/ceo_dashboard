/**
 * useInboxState Hook
 * Gerencia todo o estado relacionado a inbox (notas, seleção, expansão)
 * Extraído de BusinessIntelligenceHub para decomposição Phase 4
 */

import { useCallback, useState } from "react";
import type { InboxNote } from "../services/apiClient";

export function useInboxState() {
  // ─ Inbox list state ─
  const [inboxNotes, setInboxNotes] = useState<InboxNote[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);

  // ─ Inbox expanded note details ─
  const [expandedInboxPath, setExpandedInboxPath] = useState<string | null>(
    null
  );
  const [expandedInboxFrontmatter, setExpandedInboxFrontmatter] = useState<
    string | null
  >(null);
  const [expandedInboxContent, setExpandedInboxContent] = useState<
    string | null
  >(null);
  const [expandedInboxLoading, setExpandedInboxLoading] = useState(false);
  const [expandedInboxError, setExpandedInboxError] = useState<string | null>(
    null
  );

  /**
   * Select/expand an inbox note
   */
  const selectInboxNote = useCallback((path: string) => {
    setExpandedInboxPath(path);
    setExpandedInboxLoading(true);
    setExpandedInboxError(null);
  }, []);

  /**
   * Clear selected inbox note
   */
  const clearSelectedInboxNote = useCallback(() => {
    setExpandedInboxPath(null);
    setExpandedInboxFrontmatter(null);
    setExpandedInboxContent(null);
    setExpandedInboxLoading(false);
    setExpandedInboxError(null);
  }, []);

  /**
   * Update expanded note details
   */
  const updateExpandedNote = useCallback(
    (data: {
      frontmatter?: string | null;
      content?: string;
      error?: string;
    }) => {
      if (data.frontmatter !== undefined) {
        setExpandedInboxFrontmatter(data.frontmatter);
      }
      if (data.content !== undefined) {
        setExpandedInboxContent(data.content);
      }
      if (data.error !== undefined) {
        setExpandedInboxError(data.error);
      }
      setExpandedInboxLoading(false);
    },
    []
  );

  return {
    // List state
    inboxNotes,
    setInboxNotes,
    inboxLoading,
    setInboxLoading,
    inboxError,
    setInboxError,

    // Expanded note state
    expandedInboxPath,
    setExpandedInboxPath,
    selectInboxNote,
    clearSelectedInboxNote,
    expandedInboxFrontmatter,
    setExpandedInboxFrontmatter,
    expandedInboxContent,
    setExpandedInboxContent,
    expandedInboxLoading,
    setExpandedInboxLoading,
    expandedInboxError,
    setExpandedInboxError,
    updateExpandedNote,
  };
}
