/**
 * useTasksState Hook
 * Gerencia todo o estado relacionado a tarefas (tasks, preferences, board state)
 * Extraído de BusinessIntelligenceHub para decomposição Phase 4
 */

import { useCallback, useState } from "react";
import type { TaskPreferences } from "../services/apiClient";

export function useTasksState() {
  // ─ Tasks display preferences ─
  const [taskViewMode, setTaskViewMode] = useState<"list" | "kanban">("list");
  const [taskSortBy, setTaskSortBy] = useState<
    "natural" | "due" | "priority" | "project"
  >("natural");
  const [taskFilterStatus, setTaskFilterStatus] = useState<
    "overdue" | "today" | "upcoming" | "all"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ─ Tasks board/kanban state ─
  const [boardOrder, setBoardOrder] = useState<Record<string, string[]>>({
    overdue: [],
    today: [],
    upcoming: [],
  });
  const [boardDragState, setBoardDragState] = useState<{
    taskId: string;
    fromColumn: string;
  } | null>(null);

  // ─ Task selection and details ─
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskPath, setSelectedTaskPath] = useState<string | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string | null>(
    null
  );
  const [selectedTaskHeading, setSelectedTaskHeading] = useState<string | null>(
    null
  );
  const [selectedTaskContent, setSelectedTaskContent] = useState<string | null>(
    null
  );
  const [selectedTaskLoading, setSelectedTaskLoading] = useState(false);
  const [selectedTaskError, setSelectedTaskError] = useState<string | null>(
    null
  );

  // ─ Task toggling ─
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    new Set()
  );

  // ─ Task preferences & priority ─
  const [taskPreferences, setTaskPreferences] =
    useState<TaskPreferences | null>(null);
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const [priorityMap, setPriorityMap] = useState<Record<string, string>>({});

  // ─ Task context/template ─
  const [taskContextDraft, setTaskContextDraft] = useState({
    workDescription: "",
    shortTermFocus: "",
    longTermGoals: "",
    otherContext: "",
  });
  const [aiCleanupLoading, setAiCleanupLoading] = useState(false);

  /**
   * Apply task preferences to state
   */
  const applyTaskPreferences = useCallback((prefs: TaskPreferences) => {
    if (!prefs) return;
    setTaskPreferences(prefs);

    const nextView =
      prefs.viewMode === "kanban" || prefs.viewMode === "list"
        ? prefs.viewMode
        : "list";
    setTaskViewMode(nextView);

    const allowedSorts = new Set(["natural", "due", "priority", "project"]);
    setTaskSortBy(
      prefs.sortBy && allowedSorts.has(prefs.sortBy)
        ? (prefs.sortBy as "natural" | "due" | "priority" | "project")
        : "natural"
    );

    setPinnedTaskIds(
      Array.isArray(prefs.pinnedTaskIds) ? prefs.pinnedTaskIds : []
    );
    setPriorityMap(prefs.priorityMap ? { ...prefs.priorityMap } : {});

    const baseBoardOrder: Record<string, string[]> = {
      overdue: [],
      today: [],
      upcoming: [],
    };
    if (prefs.boardOrder) {
      Object.entries(prefs.boardOrder).forEach(([column, ids]) => {
        baseBoardOrder[column] = Array.isArray(ids)
          ? ids.map((id) => String(id))
          : [];
      });
    }
    setBoardOrder(baseBoardOrder);

    const template = prefs.contextTemplate || {};
    setTaskContextDraft({
      workDescription: template.workDescription || "",
      shortTermFocus: template.shortTermFocus || "",
      longTermGoals: template.longTermGoals || "",
      otherContext: template.otherContext || "",
    });
  }, []);

  /**
   * Clear selected task
   */
  const clearSelectedTask = useCallback(() => {
    setSelectedTaskId(null);
    setSelectedTaskPath(null);
    setSelectedTaskTitle(null);
    setSelectedTaskHeading(null);
    setSelectedTaskContent(null);
    setSelectedTaskLoading(false);
    setSelectedTaskError(null);
  }, []);

  /**
   * Toggle task completion
   */
  const toggleTaskCompletion = useCallback((taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  /**
   * Pin/unpin task
   */
  const togglePinnedTask = useCallback((taskId: string) => {
    setPinnedTaskIds((prev) => {
      if (prev.includes(taskId)) {
        return prev.filter((id) => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  }, []);

  return {
    // Display preferences
    taskViewMode,
    setTaskViewMode,
    taskSortBy,
    setTaskSortBy,
    taskFilterStatus,
    setTaskFilterStatus,
    searchTerm,
    setSearchTerm,

    // Board state
    boardOrder,
    setBoardOrder,
    boardDragState,
    setBoardDragState,

    // Selection
    selectedTaskId,
    setSelectedTaskId,
    selectedTaskPath,
    setSelectedTaskPath,
    selectedTaskTitle,
    setSelectedTaskTitle,
    selectedTaskHeading,
    setSelectedTaskHeading,
    selectedTaskContent,
    setSelectedTaskContent,
    selectedTaskLoading,
    setSelectedTaskLoading,
    selectedTaskError,
    setSelectedTaskError,
    clearSelectedTask,

    // Toggling
    togglingTaskId,
    setTogglingTaskId,
    completedTaskIds,
    setCompletedTaskIds,
    toggleTaskCompletion,

    // Preferences
    taskPreferences,
    setTaskPreferences,
    pinnedTaskIds,
    setPinnedTaskIds,
    togglePinnedTask,
    priorityMap,
    setPriorityMap,
    applyTaskPreferences,

    // Context/template
    taskContextDraft,
    setTaskContextDraft,
    aiCleanupLoading,
    setAiCleanupLoading,
  };
}
