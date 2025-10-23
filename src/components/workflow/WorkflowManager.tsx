"use client";

import React, { useEffect, useState } from "react";
import { Play, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { Workflow, WorkflowExecution } from "../../services/workflowExecutionService";

interface WorkflowManagerProps {
  onWorkflowSelect?: (workflow: Workflow) => void;
}

export default function WorkflowManager({
  onWorkflowSelect,
}: WorkflowManagerProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (selectedWorkflow) {
      fetchExecutions(selectedWorkflow.id);
    }
  }, [selectedWorkflow]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/prebuilt-workflows");
      const data = await res.json();
      setWorkflows(data);
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/prebuilt-workflows/${workflowId}/executions`);
      const data = await res.json();
      setExecutions(data);
    } catch (error) {
      console.error("Failed to fetch executions:", error);
    }
  };

  const handleExecute = async (workflowId: string) => {
    try {
      setExecuting(true);
      const res = await fetch(`/api/prebuilt-workflows/${workflowId}/execute`, {
        method: "POST",
      });
      const execution = await res.json();
      fetchExecutions(workflowId);
    } catch (error) {
      console.error("Failed to execute workflow:", error);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Workflows List */}
      <div className="lg:col-span-1 bg-slate-900 rounded-lg p-4 border border-slate-700">
        <h3 className="font-semibold text-sm mb-4">Workflows Disponíveis</h3>
        <div className="space-y-2">
          {workflows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => setSelectedWorkflow(workflow)}
              className={`w-full text-left p-3 rounded transition-colors ${
                selectedWorkflow?.id === workflow.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{workflow.name}</p>
                  <p className="text-xs opacity-75 mt-1">{workflow.description}</p>
                </div>
                {workflow.enabled ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-1 text-red-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Details & Executions */}
      <div className="lg:col-span-2 space-y-6">
        {selectedWorkflow ? (
          <>
            {/* Workflow Header */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedWorkflow.name}</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {selectedWorkflow.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-slate-400">
                      Schedule: <code className="text-yellow-400">{selectedWorkflow.schedule}</code>
                    </span>
                    {selectedWorkflow.lastRun && (
                      <span className="text-xs text-slate-400">
                        Last run:{" "}
                        {new Date(selectedWorkflow.lastRun).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleExecute(selectedWorkflow.id)}
                  disabled={executing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 rounded transition-colors text-sm"
                >
                  {executing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Execute Now
                    </>
                  )}
                </button>
              </div>

              {/* Tasks */}
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Tasks:</p>
                <div className="space-y-1">
                  {selectedWorkflow.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="text-xs p-2 bg-slate-800 rounded"
                    >
                      <p className="text-slate-300">
                        <span className="text-blue-400">{task.name}</span> (
                        <code className="text-yellow-400">{task.action}</code>)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Execution History */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <h3 className="font-semibold text-sm mb-4">Execution History</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {executions.length === 0 ? (
                  <p className="text-xs text-slate-400">Sem execuções registradas</p>
                ) : (
                  executions.map((exec) => (
                    <div
                      key={exec.id}
                      className="p-2 bg-slate-800 rounded text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {exec.status === "completed" && (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                          {exec.status === "running" && (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                          )}
                          {exec.status === "failed" && (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-slate-300">
                            {new Date(exec.startedAt).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-slate-400">{exec.duration}ms</span>
                      </div>
                      {exec.error && (
                        <p className="text-red-400 mt-1">{exec.error}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-400 py-12">
            Selecione um workflow para ver detalhes
          </div>
        )}
      </div>
    </div>
  );
}
