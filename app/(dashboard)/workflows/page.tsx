"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import WorkflowBuilder from "@/components/workflow/WorkflowBuilder";
import type { WorkflowDefinition } from "@/components/workflow/types";
import { useAPI } from "@/hooks/useAPI";

interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
}

export default function WorkflowsPage() {
  const api = useAPI();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setLoading(true);
        const response = await api.request<{ success: boolean; workflows: WorkflowDefinition[] }>(
          "/api/workflows"
        );
        if (response?.success && Array.isArray(response.workflows)) {
          setWorkflows(
            response.workflows.map((workflow) => ({
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
            }))
          );
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load workflows list");
      } finally {
        setLoading(false);
      }
    };

    void loadWorkflows();
  }, [api]);

  const handleSelectWorkflow = async (id: string) => {
    try {
      setLoadingWorkflow(true);
      const response = await api.request<{ success: boolean; workflow: WorkflowDefinition }>(
        `/api/workflows/${id}`
      );
      if (response?.success) {
        setSelectedWorkflow(response.workflow);
        setActiveId(response.workflow.id);
        toast.success(`Workflow “${response.workflow.name}” loaded`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to load workflow details");
    } finally {
      setLoadingWorkflow(false);
    }
  };

  const handleSave = async (definition: WorkflowDefinition) => {
    const payload = {
      name: definition.name,
      description: definition.description,
      enabled: definition.enabled,
      trigger: definition.trigger,
      actions: definition.actions,
      settings: definition.settings,
      source: definition.source,
    };

    if (activeId) {
      await api.request(`/api/workflows/${activeId}`, {
        method: "PATCH",
        body: payload,
      });
      setWorkflows((prev) =>
        prev.map((item) =>
          item.id === activeId
            ? { id: activeId, name: definition.name, description: definition.description }
            : item
        )
      );
      setSelectedWorkflow({ ...definition, id: activeId });
      return activeId;
    }

    const response = await api.request<{ success: boolean; id: string }>("/api/workflows", {
      method: "POST",
      body: payload,
    });

    if (response?.success && response.id) {
      setWorkflows((prev) => [
        ...prev,
        {
          id: response.id,
          name: definition.name,
          description: definition.description,
        },
      ]);
      setActiveId(response.id);
      setSelectedWorkflow({ ...definition, id: response.id });
      return response.id;
    }

    throw new Error("Workflow service did not return an identifier");
  };

  const handleTest = async (definition: WorkflowDefinition) => {
    if (!activeId) {
      throw new Error("Save the workflow before executing tests");
    }

    await api.request(`/api/workflows/${activeId}/execute`, {
      method: "POST",
      body: {
        context: {
          preview: true,
          triggerType: definition.trigger.type,
        },
      },
    });
  };

  const builderInitialWorkflow = useMemo(() => selectedWorkflow, [selectedWorkflow]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full min-h-0">
        <aside className="w-64 border-r border-zinc-900/70 bg-zinc-950/80">
          <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Workflows
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedWorkflow(null);
                setActiveId(undefined);
              }}
              className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
            >
              + New
            </button>
          </div>
          <div className="max-h-full overflow-y-auto px-2 py-3">
            {loading ? (
              <p className="px-2 py-3 text-sm text-zinc-500">Loading workflows...</p>
            ) : workflows.length === 0 ? (
              <p className="px-2 py-3 text-sm text-zinc-500">
                No workflows yet. Create your first automation.
              </p>
            ) : (
              <ul className="space-y-1">
                {workflows.map((workflow) => (
                  <li key={workflow.id}>
                    <button
                      type="button"
                      onClick={() => void handleSelectWorkflow(workflow.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-zinc-900/80 ${
                        activeId === workflow.id
                          ? "border border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                          : "border border-transparent text-zinc-300"
                      }`}
                    >
                      <span className="block font-semibold">{workflow.name}</span>
                      {workflow.description && (
                        <span className="mt-1 line-clamp-2 text-xs text-zinc-500">
                          {workflow.description}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <div className="flex-1 min-h-0">
          {loadingWorkflow ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Loading workflow...
            </div>
          ) : (
            <WorkflowBuilder
              workflowId={activeId}
              initialWorkflow={builderInitialWorkflow ?? undefined}
              onSave={handleSave}
              onTest={handleTest}
            />
          )}
        </div>
      </div>
    </div>
  );
}
