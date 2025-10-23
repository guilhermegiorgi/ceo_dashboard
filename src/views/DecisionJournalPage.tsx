'use client';

import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";
import apiClient from "../services/apiClient";

interface Decision {
  id: string;
  title: string;
  context: string;
  outcome: string;
  date: string;
  status?: "pending" | "in_progress" | "completed";
  impact?: "low" | "medium" | "high";
}

const DecisionJournalPage: React.FC = () => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDecision, setNewDecision] = useState({
    title: "",
    context: "",
    outcome: "",
  });

  useEffect(() => {
    loadDecisions();
  }, []);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDecisions();
      setDecisions(data);
    } catch (error) {
      console.error("Failed to load decisions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDecision = async () => {
    if (!newDecision.title || !newDecision.context) {
      alert("Título e contexto são obrigatórios");
      return;
    }

    try {
      await apiClient.createDecision({
        ...newDecision,
        date: new Date().toISOString(),
      });
      await loadDecisions();
      setShowCreateModal(false);
      setNewDecision({ title: "", context: "", outcome: "" });
    } catch (error) {
      console.error("Failed to create decision:", error);
      alert("Erro ao criar decisão");
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-400" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      default:
        return <FileText className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getImpactColor = (impact?: string) => {
    switch (impact) {
      case "high":
        return "border-rose-500/30 bg-rose-500/10 text-rose-300";
      case "medium":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
      case "low":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
      default:
        return "border-neutral-800 bg-neutral-900 text-zinc-400";
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-800 border-t-emerald-500" />
          <p className="text-sm text-zinc-400">Carregando decisões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-gradient-to-br from-orange-500/20 to-amber-500/20">
            <ClipboardCheck className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">
              Decision Journal
            </h1>
            <p className="text-sm text-zinc-500">
              Registre e acompanhe decisões estratégicas
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-300 transition hover:border-orange-500/50 hover:bg-orange-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Decisão</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900 p-12 text-center">
            <ClipboardCheck className="mb-3 h-12 w-12 text-zinc-700" />
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Nenhuma decisão registrada
            </p>
            <p className="mb-4 text-xs text-zinc-500">
              Comece a documentar suas decisões estratégicas
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-300 transition hover:border-orange-500/50 hover:bg-orange-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Decisão</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {decisions.map((decision) => (
              <div
                key={decision.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-neutral-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10">
                      {getStatusIcon(decision.status)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-100">
                        {decision.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(decision.date).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {decision.impact && (
                    <span
                      className={`rounded-lg border px-2 py-1 text-xs font-medium ${getImpactColor(
                        decision.impact
                      )}`}
                    >
                      {decision.impact}
                    </span>
                  )}
                </div>

                <div className="space-y-2 border-t border-neutral-800 pt-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-500">
                      Contexto:
                    </p>
                    <p className="text-sm text-zinc-300">{decision.context}</p>
                  </div>

                  {decision.outcome && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        Resultado Esperado:
                      </p>
                      <p className="text-sm text-zinc-300">
                        {decision.outcome}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Decision Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                Nova Decisão
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewDecision({ title: "", context: "", outcome: "" });
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-neutral-800 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-300">
                  Título da Decisão
                </label>
                <input
                  type="text"
                  value={newDecision.title}
                  onChange={(e) =>
                    setNewDecision({ ...newDecision, title: e.target.value })
                  }
                  placeholder="Ex: Expandir operação para Mato Grosso"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-300">
                  Contexto / Problema
                </label>
                <textarea
                  value={newDecision.context}
                  onChange={(e) =>
                    setNewDecision({ ...newDecision, context: e.target.value })
                  }
                  placeholder="Descreva o contexto e o problema que levou a esta decisão..."
                  rows={4}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-300">
                  Resultado Esperado (opcional)
                </label>
                <textarea
                  value={newDecision.outcome}
                  onChange={(e) =>
                    setNewDecision({ ...newDecision, outcome: e.target.value })
                  }
                  placeholder="Qual o resultado esperado desta decisão?"
                  rows={3}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateDecision}
                  className="flex-1 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-300 transition hover:border-orange-500/50 hover:bg-orange-500/20"
                >
                  Registrar Decisão
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewDecision({ title: "", context: "", outcome: "" });
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
    </div>
  );
};

export default DecisionJournalPage;
