import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Play,
  Pause,
  Settings as SettingsIcon,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import apiClient from "../services/apiClient";

interface Agent {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "running";
  lastRun?: string;
  successRate?: number;
  totalRuns?: number;
}

interface AgentRun {
  id: string;
  agent_id: string;
  agent_name?: string;
  start_time: string;
  end_time?: string | null;
  status: string;
  log?: string | null;
}

const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [newAgent, setNewAgent] = useState({ name: "", description: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsData, runsData] = await Promise.all([
        apiClient.getAgents(),
        apiClient.getRuns(10),
      ]);
      setAgents(agentsData);
      setRuns(runsData);
    } catch (error) {
      console.error("Failed to load agents data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgent.name || !newAgent.description) {
      alert("Nome e descrição são obrigatórios");
      return;
    }

    try {
      await apiClient.createAgent(newAgent);
      await loadData();
      setShowCreateModal(false);
      setNewAgent({ name: "", description: "" });
    } catch (error) {
      console.error("Failed to create agent:", error);
      alert("Erro ao criar agente");
    }
  };

  const handleRunAgent = async (agentId: string) => {
    try {
      await apiClient.runAgent(agentId);
      await loadData();
    } catch (error) {
      console.error("Failed to run agent:", error);
      alert("Erro ao executar agente");
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Tem certeza que deseja deletar este agente?")) {
      return;
    }

    try {
      await apiClient.deleteAgent(agentId);
      await loadData();
    } catch (error) {
      console.error("Failed to delete agent:", error);
      alert("Erro ao deletar agente");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "success":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "running":
      case "in_progress":
        return <Clock className="h-4 w-4 animate-spin text-blue-400" />;
      case "failed":
      case "error":
        return <AlertCircle className="h-4 w-4 text-rose-400" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-800 border-t-emerald-500" />
          <p className="text-sm text-zinc-400">Carregando agentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Sparkles className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Agentes de IA</h1>
            <p className="text-sm text-zinc-500">
              Gerencie e execute seus agentes autônomos
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:border-purple-500/50 hover:bg-purple-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Agente</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        {/* Agents List */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-zinc-100">
            Agentes Ativos
          </h2>

          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900 p-12 text-center">
              <Sparkles className="mb-3 h-12 w-12 text-zinc-700" />
              <p className="mb-2 text-sm font-medium text-zinc-400">
                Nenhum agente configurado
              </p>
              <p className="mb-4 text-xs text-zinc-500">
                Crie seu primeiro agente para automatizar tarefas
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:border-purple-500/50 hover:bg-purple-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Agente</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-neutral-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10">
                        {getStatusIcon(agent.status)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-100">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {agent.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedAgent(agent)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-neutral-800 hover:text-zinc-100"
                        title="Configurações"
                      >
                        <SettingsIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-neutral-800 hover:text-rose-400"
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                    <div className="flex gap-4 text-xs text-zinc-500">
                      {agent.totalRuns !== undefined && (
                        <span>{agent.totalRuns} execuções</span>
                      )}
                      {agent.successRate !== undefined && (
                        <span>{agent.successRate}% sucesso</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleRunAgent(agent.id)}
                      disabled={agent.status === "running"}
                      className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {agent.status === "running" ? (
                        <>
                          <Pause className="h-3 w-3" />
                          <span>Executando...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          <span>Executar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Runs */}
        <div className="flex w-80 flex-col gap-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-zinc-100">
            Execuções Recentes
          </h2>

          <div className="space-y-3">
            {runs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900 p-8 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
                <p className="text-sm text-zinc-500">Nenhuma execução ainda</p>
              </div>
            ) : (
              runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-100">
                      {run.agent_name || "Agente"}
                    </span>
                    {getStatusIcon(run.status)}
                  </div>

                  <div className="space-y-1 text-xs text-zinc-500">
                    <div className="flex justify-between">
                      <span>Início:</span>
                      <span className="text-zinc-400">
                        {new Date(run.start_time).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {run.end_time && (
                      <div className="flex justify-between">
                        <span>Fim:</span>
                        <span className="text-zinc-400">
                          {new Date(run.end_time).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-zinc-400">{run.status}</span>
                    </div>
                  </div>

                  {run.log && (
                    <div className="mt-2 rounded-lg border border-neutral-800 bg-neutral-950 p-2">
                      <p className="text-xs text-zinc-500">
                        {run.log.length > 100
                          ? run.log.substring(0, 100) + "..."
                          : run.log}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                Novo Agente
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAgent({ name: "", description: "" });
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-neutral-800 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-300">
                  Nome do Agente
                </label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, name: e.target.value })
                  }
                  placeholder="Ex: Analisador de Notas"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-300">
                  Descrição
                </label>
                <textarea
                  value={newAgent.description}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, description: e.target.value })
                  }
                  placeholder="Descreva o que este agente faz..."
                  rows={4}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateAgent}
                  className="flex-1 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300 transition hover:border-purple-500/50 hover:bg-purple-500/20"
                >
                  Criar Agente
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewAgent({ name: "", description: "" });
                  }}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                Configurações do Agente
              </h3>
              <button
                onClick={() => setSelectedAgent(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-neutral-800 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-300">Nome</label>
                <input
                  type="text"
                  value={selectedAgent.name}
                  disabled
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-300">
                  Descrição
                </label>
                <textarea
                  value={selectedAgent.description}
                  disabled
                  rows={4}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-400"
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <h4 className="mb-2 text-sm font-medium text-zinc-300">
                  Estatísticas
                </h4>
                <div className="space-y-2 text-xs text-zinc-500">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-zinc-400">
                      {selectedAgent.status}
                    </span>
                  </div>
                  {selectedAgent.totalRuns !== undefined && (
                    <div className="flex justify-between">
                      <span>Total de execuções:</span>
                      <span className="text-zinc-400">
                        {selectedAgent.totalRuns}
                      </span>
                    </div>
                  )}
                  {selectedAgent.successRate !== undefined && (
                    <div className="flex justify-between">
                      <span>Taxa de sucesso:</span>
                      <span className="text-zinc-400">
                        {selectedAgent.successRate}%
                      </span>
                    </div>
                  )}
                  {selectedAgent.lastRun && (
                    <div className="flex justify-between">
                      <span>Última execução:</span>
                      <span className="text-zinc-400">
                        {new Date(selectedAgent.lastRun).toLocaleString(
                          "pt-BR"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedAgent(null)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsPage;
