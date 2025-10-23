/**
 * useUIState Hook
 * Gerencia estado da UI (panels, utilities, resizing)
 * Extraído de BusinessIntelligenceHub para decomposição Phase 4
 */

import { useCallback, useState } from "react";

export type UtilityView =
  | "tasks"
  | "inbox"
  | "dailyNotes"
  | "workflows"
  | "search"
  | "agents"
  | "projects"
  | "chatHistory"
  | "knowledgeGraph"
  | "mcpTools"
  | "shortcuts"
  | "analytics";

export function useUIState() {
  // ─ Panel state ─
  const [activeUtility, setActiveUtility] = useState<UtilityView>("tasks");
  const [rightPanelRatio, setRightPanelRatio] = useState(0.3); // 30% por padrão
  const [isDraggingResize, setIsDraggingResize] = useState(false);

  // ─ Settings and modals ─
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  /**
   * Handle resize start
   */
  const handleResizeStart = useCallback(
    (_clientX: number, _clientY: number) => {
      setIsDraggingResize(true);
    },
    []
  );

  /**
   * Handle resize end
   */
  const handleResizeEnd = useCallback(() => {
    setIsDraggingResize(false);
  }, []);

  /**
   * Update panel ratio based on mouse position
   */
  const updatePanelRatio = useCallback((clientX: number) => {
    const container = document.getElementById("hub-container");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newRatio = (rect.right - clientX) / rect.width;
    const clampedRatio = Math.min(Math.max(newRatio, 0.2), 0.6); // 20-60%
    setRightPanelRatio(clampedRatio);
  }, []);

  /**
   * Toggle utility panel
   */
  const toggleUtility = useCallback((utility: UtilityView) => {
    setActiveUtility((prev) => (prev === utility ? "tasks" : utility));
  }, []);

  /**
   * Switch utility
   */
  const switchUtility = useCallback((utility: UtilityView) => {
    setActiveUtility(utility);
  }, []);

  /**
   * Toggle settings modal
   */
  const toggleSettingsModal = useCallback(() => {
    setShowSettingsModal((prev) => !prev);
  }, []);

  /**
   * Toggle user profile modal
   */
  const toggleUserProfileModal = useCallback(() => {
    setShowUserProfileModal((prev) => !prev);
  }, []);

  /**
   * Set view parameter in URL
   */
  const setViewParam = useCallback((view: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.history.replaceState({}, "", url.toString());
  }, []);

  /**
   * Handle utility selection
   */
  const handleUtilitySelect = useCallback(
    (utility: UtilityView) => {
      setActiveUtility(utility);
      setViewParam(utility);
    },
    [setViewParam]
  );

  return {
    // Panel state
    activeUtility,
    setActiveUtility,
    switchUtility,
    toggleUtility,
    handleUtilitySelect,
    rightPanelRatio,
    setRightPanelRatio,
    isDraggingResize,
    setIsDraggingResize,
    handleResizeStart,
    handleResizeEnd,
    updatePanelRatio,

    // Modals
    showSettingsModal,
    setShowSettingsModal,
    toggleSettingsModal,
    showUserProfileModal,
    setShowUserProfileModal,
    toggleUserProfileModal,

    // URL state
    setViewParam,
  };
}
