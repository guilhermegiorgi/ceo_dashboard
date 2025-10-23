"use client";

import React from "react";
import {
  ListTodo,
  List as ListIcon,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  CheckCircle,
  UserCircle,
} from "lucide-react";

interface SortOption {
  id: string;
  label: string;
  value: string;
}

interface TaskBoardHeaderProps {
  taskViewMode: "list" | "kanban";
  taskSortBy: string;
  showSortMenu: boolean;
  sortOptions: SortOption[];
  sortOrder: string;
  filteredTasks: any[];
  metricsTooltip: string;
  aiCleanupLoading: boolean;
  completedModalOpen: boolean;
  
  onViewModeChange: (mode: "list" | "kanban") => void;
  onSortChange: (sort: string) => void;
  setShowSortMenu: (show: boolean) => void;
  onAiCleanup: () => void;
  onOpenCompletedModal: () => void;
  onOpenContextModal: () => void;
  totalActiveTasks?: number;
  dueCriticalTasks?: number;
}

const TaskBoardHeader: React.FC<TaskBoardHeaderProps> = ({
  taskViewMode,
  taskSortBy,
  showSortMenu,
  sortOptions,
  sortOrder,
  filteredTasks,
  metricsTooltip,
  aiCleanupLoading,
  completedModalOpen,
  
  onViewModeChange,
  onSortChange,
  setShowSortMenu,
  onAiCleanup,
  onOpenCompletedModal,
  onOpenContextModal,
  totalActiveTasks,
  dueCriticalTasks
}) => {
  const handleSortMenuToggle = () => {
    setShowSortMenu(!showSortMenu);
  };

  const totalActive = totalActiveTasks ?? filteredTasks.length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs transition ${
              taskViewMode === "list"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-neutral-800 bg-neutral-900 text-zinc-400 hover:border-neutral-600 hover:text-zinc-100"
            }`}
            title="Visualização em lista"
          >
            <ListIcon className="h-4 w-4" />
            <span>Lista</span>
          </button>
          
          <button
            type="button"
            onClick={() => onViewModeChange("kanban")}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs transition ${
              taskViewMode === "kanban"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-neutral-800 bg-neutral-900 text-zinc-400 hover:border-neutral-600 hover:text-zinc-100"
            }`}
            title="Visualização em board"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Board</span>
          </button>

          <div className="relative">
            <button
              type="button"
              data-sort-trigger
              onClick={handleSortMenuToggle}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Ordenar
            </button>
            
            {showSortMenu && (
              <div
                data-sort-menu
                className="absolute left-0 z-30 mt-2 w-48 rounded-xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-2xl"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-zinc-300 transition hover:bg-neutral-900 ${
                      taskSortBy === option.value ? "text-emerald-300" : ""
                    }`}
                    onClick={() => onSortChange(option.value)}
                  >
                    {option.label}
                    {taskSortBy === option.value && (
                      <Sparkles className="h-4 w-4 text-emerald-300" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAiCleanup}
            disabled={aiCleanupLoading}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            AI cleanup
          </button>
          
          <button
            type="button"
            onClick={onOpenCompletedModal}
            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
          >
            <CheckCircle className="h-4 w-4" />
            Concluídas
          </button>
          
          <button
            type="button"
            onClick={onOpenContextModal}
            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
          >
            <UserCircle className="h-4 w-4" />
            User context
          </button>
          
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-zinc-300"
            title={metricsTooltip}
          >
            📊
            <span>
              {dueCriticalTasks || 0}/{totalActive}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskBoardHeader;
