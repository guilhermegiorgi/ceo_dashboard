'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Settings,
  XCircle,
} from 'lucide-react';
import apiClient, {
  MCPStatus,
  MCPTool,
  MCPSession,
} from '@/services/apiClient';

type TabType = 'status' | 'tools' | 'sessions';

const MCPIntegration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Status state
  const [status, setStatus] = useState<MCPStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Tools state
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [testArgs, setTestArgs] = useState<string>('{}');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<MCPSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Tool expansion state
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  // Fetch status
  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const data = await apiClient.getMCPStatus();
      setStatus(data);

      if (data.connected) {
        toast.success('MCP está conectado e operacional');
      } else {
        toast.error('MCP não está conectado');
      }
    } catch (error) {
      console.error('Failed to fetch MCP status', error);
      toast.error('Não foi possível verificar status do MCP');
      setStatus({
        status: 'error',
        connected: false,
        message: 'Erro ao verificar status',
      });
    } finally {
      setStatusLoading(false);
    }
  };

  // Fetch tools
  const fetchTools = async () => {
    setToolsLoading(true);
    try {
      const data = await apiClient.getMCPTools();
      setTools(data.tools || []);

      if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch MCP tools', error);
      toast.error('Não foi possível carregar ferramentas MCP');
      setTools([]);
    } finally {
      setToolsLoading(false);
    }
  };

  // Fetch sessions
  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await apiClient.getMCPSessions();
      setSessions(data.sessions || []);

      if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch MCP sessions', error);
      toast.error('Não foi possível carregar sessões MCP');
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Test tool execution
  const handleTestTool = async () => {
    if (!selectedTool) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      const args = JSON.parse(testArgs);

      const result = await apiClient.testMCPTool({
        toolName: selectedTool.name,
        arguments: args,
      });

      setTestResult(result);

      if (result.success) {
        toast.success(`Ferramenta ${selectedTool.name} executada com sucesso`);
      } else {
        toast.error(result.error || 'Falha ao executar ferramenta');
      }
    } catch (error: any) {
      console.error('Tool test failed', error);
      toast.error('JSON inválido ou erro ao testar ferramenta');
      setTestResult({
        success: false,
        error: error.message,
        toolName: selectedTool.name,
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Refresh current tab data
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      switch (activeTab) {
        case 'status':
          await fetchStatus();
          break;
        case 'tools':
          await fetchTools();
          break;
        case 'sessions':
          await fetchSessions();
          break;
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Load initial data
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStatus(), fetchTools(), fetchSessions()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Toggle tool expansion
  const toggleToolExpansion = (toolName: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolName)) {
      newExpanded.delete(toolName);
    } else {
      newExpanded.add(toolName);
    }
    setExpandedTools(newExpanded);
  };

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-5 shadow-inner shadow-black/30 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <Server className="h-5 w-5 text-emerald-400" />
            MCP Integration
          </h2>
          <p className="text-sm text-zinc-400">
            Gerencie e monitore a integração com Model Context Protocol
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Atualizar
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-neutral-800 bg-neutral-950/90 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'status'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Activity className="h-4 w-4" />
          Status
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tools')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'tools'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Settings className="h-4 w-4" />
          Ferramentas ({tools.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'sessions'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Sessões ({sessions.filter(s => !s.isExpired).length})
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex h-40 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/90 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          Carregando dados do MCP...
        </div>
      )}

      {/* Status Tab */}
      {!loading && activeTab === 'status' && (
        <div className="space-y-4">
          {statusLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/90 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              Verificando status...
            </div>
          ) : (
            <>
              {/* Connection Status Card */}
              <div
                className={`rounded-2xl border p-5 shadow-inner shadow-black/20 ${
                  status?.connected
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-rose-500/40 bg-rose-500/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  {status?.connected ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  ) : (
                    <XCircle className="h-8 w-8 text-rose-400" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-zinc-100">
                      {status?.connected ? 'Conectado' : 'Desconectado'}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-300">
                      {status?.message || 'Status desconhecido'}
                    </p>
                    {status?.error && (
                      <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-xs text-rose-200">
                        <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                        {status.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Connection Details */}
              {status?.details && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Session ID
                    </p>
                    <p className="mt-1 font-mono text-sm text-zinc-200">
                      {status.details.sessionId || 'N/D'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Ferramentas Disponíveis
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-400">
                      {status.details.toolsAvailable || 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-4 md:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Base URL
                    </p>
                    <p className="mt-1 font-mono text-sm text-zinc-200">
                      {status.details.baseUrl || 'N/D'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tools Tab */}
      {!loading && activeTab === 'tools' && (
        <div className="space-y-4">
          {toolsLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/90 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              Carregando ferramentas...
            </div>
          ) : tools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-6 text-center text-sm text-zinc-500">
              Nenhuma ferramenta MCP disponível
            </div>
          ) : (
            <>
              {/* Tools List */}
              <div className="space-y-2">
                {tools.map((tool) => {
                  const isExpanded = expandedTools.has(tool.name);

                  return (
                    <div
                      key={tool.name}
                      className="rounded-xl border border-neutral-800 bg-neutral-950/90 transition hover:border-emerald-500/40"
                    >
                      <button
                        type="button"
                        onClick={() => toggleToolExpansion(tool.name)}
                        className="flex w-full items-start gap-3 p-4 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Code2 className="h-4 w-4 text-emerald-400" />
                            <h4 className="font-mono text-sm font-semibold text-zinc-100">
                              {tool.name}
                            </h4>
                            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] text-zinc-400">
                              {tool.category}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-400">
                            {tool.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTool(tool);
                            setTestArgs('{}');
                            setTestResult(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-zinc-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
                        >
                          <Play className="h-3 w-3" />
                          Testar
                        </button>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-neutral-800 bg-neutral-900/60 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Parâmetros
                          </p>
                          <pre className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs text-zinc-300">
                            {JSON.stringify(tool.parameters, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Test Tool Panel */}
              {selectedTool && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-100">
                    <Play className="h-4 w-4 text-emerald-400" />
                    Testar Ferramenta: {selectedTool.name}
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-400">
                        Argumentos (JSON)
                      </label>
                      <textarea
                        value={testArgs}
                        onChange={(e) => setTestArgs(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-zinc-200 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        placeholder='{"key": "value"}'
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTestTool}
                      disabled={testLoading}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-500/60 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {testLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Executar Teste
                    </button>

                    {testResult && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Resultado
                        </p>
                        <pre className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs text-zinc-300">
                          {JSON.stringify(testResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {!loading && activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessionsLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/90 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              Carregando sessões...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-6 text-center text-sm text-zinc-500">
              Nenhuma sessão MCP ativa
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.key}
                  className={`rounded-xl border p-4 ${
                    session.isExpired
                      ? 'border-neutral-800 bg-neutral-900/60 opacity-60'
                      : 'border-emerald-500/40 bg-emerald-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono text-sm font-semibold text-zinc-100">
                          {session.sessionId}
                        </h4>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${
                            session.isExpired
                              ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                              : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {session.isExpired ? 'Expirada' : 'Ativa'}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 text-xs md:grid-cols-3">
                        <div>
                          <p className="text-zinc-500">Chave</p>
                          <p className="font-mono text-zinc-300">{session.key}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Ferramentas</p>
                          <p className="text-zinc-300">{session.toolCount}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Expira em</p>
                          <p className="text-zinc-300">
                            {new Date(session.expiresAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default MCPIntegration;
