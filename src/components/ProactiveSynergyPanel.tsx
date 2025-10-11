import React, { useState, useEffect } from 'react';
import {
  Link2,
  AlertTriangle,
  TrendingUp,
  Brain,
  MessageSquare,
  Calendar,
  Lightbulb,
  GitBranch,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader,
  Database,
  FileText,
  Hash,
  BarChart3
} from 'lucide-react';

import apiClient, { SynergyInsight } from '../services/apiClient';

// --- Tipos ---
type NotificationType = {
  id: string;
  message: string;
  type: 'success' | 'error';
};

type VaultStats = {
  totalNotes: number;
  totalLinks: number;
  totalTags: number;
  folderStats: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
};

// --- Componente ---
const ProactiveSynergyPanel: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [insights, setInsights] = useState<SynergyInsight[]>([]);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null); // Armazena o ID do card sendo salvo
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [noteQuery, setNoteQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(15);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [template, setTemplate] = useState<string>('Analise o contexto e gere 1 insight estratégico acionável (oportunidade, risco ou recomendação). Use evidências do conteúdo.');
  const [temperature, setTemperature] = useState<number>(0.5);
  const [iterations, setIterations] = useState<number>(1);
  const [obcStatus, setObcStatus] = useState<any>(null);
  const [recentChanges, setRecentChanges] = useState<any[]>([]);
  // Persist settings in localStorage
  useEffect(() => {
    try {
      const ns = 'synergy.';
      const nq = localStorage.getItem(ns+'noteQuery');
      const lim = localStorage.getItem(ns+'limit');
      const as = localStorage.getItem(ns+'autoSave');
      const tpl = localStorage.getItem(ns+'template');
      const temp = localStorage.getItem(ns+'temperature');
      const it = localStorage.getItem(ns+'iterations');
      if (nq !== null) setNoteQuery(nq);
      if (lim !== null) setLimit(parseInt(lim));
      if (as !== null) setAutoSave(as === 'true');
      if (tpl !== null) (setTemplate as any)?.(tpl);
      if (temp !== null) (setTemperature as any)?.(parseFloat(temp));
      if (it !== null) (setIterations as any)?.(parseInt(it));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const ns = 'synergy.';
      localStorage.setItem(ns+'noteQuery', noteQuery);
      localStorage.setItem(ns+'limit', String(limit));
      localStorage.setItem(ns+'autoSave', String(autoSave));
      localStorage.setItem(ns+'template', (template as any) ?? '');
      localStorage.setItem(ns+'temperature', String((temperature as any) ?? 0.5));
      localStorage.setItem(ns+'iterations', String((iterations as any) ?? 1));
    } catch {}
  }, [noteQuery, limit, autoSave, template, temperature, iterations]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [fetchedInsights, stats, statusResp, recentResp] = await Promise.all([
          apiClient.getInsights(),
          fetchVaultStats(),
          apiClient.getObcStatus(),
          apiClient.getVaultRecentChanges(10, 30)
        ]);
        setInsights(fetchedInsights);
        setVaultStats(stats);
        setObcStatus(statusResp?.data || null);
        setRecentChanges(recentResp?.data?.files || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchVaultStats = async (): Promise<VaultStats | null> => {
    try {
      const response = await apiClient.getVaultStats();
      return response.data || response;
    } catch (error) {
      console.error('Failed to fetch vault stats:', error);
      return null;
    }
  };

  const showNotification = (id: string, message: string, type: 'success' | 'error') => {
    setNotification({ id, message, type });
    setTimeout(() => setNotification(null), 5000); // A notificação desaparece após 5 segundos
  };

  const typeConfig = {
    unexpected_connection: { icon: GitBranch, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Unexpected Connection' },
    knowledge_gap: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Knowledge Gap' },
    success_pattern: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Success Pattern' },
    strategic_question: { icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Strategic Question' }
  };

  const urgencyColors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400'
  };

  const handleExploreConnection = async (cardId: string) => {
    const card = insights.find(c => c.id === cardId);
    if (!card || !card.relatedNotes?.length) return;

    try {
      // Buscar conteúdo das notas relacionadas
      const relatedNotesContent = [];
      for (const notePath of card.relatedNotes.slice(0, 3)) { // Limitar a 3 notas
        try {
          const data = await apiClient.getVaultNote(notePath);
          relatedNotesContent.push({
            path: notePath,
            content: data.data.content?.substring(0, 500) + '...' || 'Conteúdo não disponível'
          });
        } catch (error) {
          console.error(`Erro ao buscar nota ${notePath}:`, error);
        }
      }

      // Aqui você poderia abrir um modal ou navegar para uma página de exploração
      console.log('Explorando conexões:', card.title, relatedNotesContent);
      showNotification(cardId, `Explorando ${relatedNotesContent.length} conexões relacionadas`, 'success');
    } catch (error) {
      console.error('Erro ao explorar conexões:', error);
      showNotification(cardId, 'Erro ao explorar conexões', 'error');
    }
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const [fetchedInsights, stats, statusResp, recentResp] = await Promise.all([
        apiClient.refreshInsightsWithParams({ note_query: noteQuery, limit, auto_save: autoSave, template, temperature, iterations }),
        fetchVaultStats(),
        apiClient.getObcStatus(),
        apiClient.getVaultRecentChanges(10, 30)
      ]);
      setInsights(fetchedInsights);
      setVaultStats(stats);
      setObcStatus(statusResp?.data || null);
      setRecentChanges(recentResp?.data?.files || []);
      setError(null);
      showNotification('refresh', 'Insights atualizados com sucesso', 'success');
    } catch (err) {
      setError('Failed to refresh insights. Please try again later.');
      showNotification('refresh', 'Erro ao atualizar insights', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleSession = async (cardId: string) => {
    const card = insights.find(c => c.id === cardId);
    if (!card) return;

    try {
      // Criar uma ação de feedback para agendamento de sessão
      const feedbackAction = {
        type: 'decision',
        title: `Sessão Estratégica: ${card.title}`,
        description: `Agendar sessão para discutir: ${card.description}`,
        obsidianNote: card.relatedNotes?.[0],
        relatedProject: 'Sessões Estratégicas',
        impact: card.potentialImpact
      };

      await apiClient.createFeedbackAction(feedbackAction);
      showNotification(cardId, 'Sessão estratégica agendada com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao agendar sessão:', error);
      showNotification(cardId, 'Erro ao agendar sessão', 'error');
    }
  };

  const handleSyncVault = async () => {
    try {
      setIsSyncing(true);
      const result = await apiClient.syncVault('pull', 'Sync from Proactive Panel');
      showNotification('sync', result.message || 'Vault sincronizado com sucesso', 'success');
      // Recarregar estatísticas após sync
      const stats = await fetchVaultStats();
      setVaultStats(stats);
    } catch (error) {
      console.error('Erro na sincronização:', error);
      showNotification('sync', 'Erro na sincronização do vault', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNote = async (cardId: string) => {
    const card = insights.find(c => c.id === cardId);
    if (!card) return;

    setIsSaving(cardId);
    setNotification(null);

    try {
      const content = `---
tags: [insight, dashboard]
source: Proactive Synergy Panel
confidence: ${card.confidence}
urgency: ${card.urgency}
---

# ${card.title}

**Description:** ${card.description}

## Key Findings
- 

## Recommendations
- 

## Related Notes
${card.relatedNotes.map(n => `- [[${n}]]`).join('\n')}
`;
      const response = await apiClient.request<any>('/api/obsidian/save-insight', {
        method: 'POST',
        body: { title: card.title, content },
      });
      showNotification(cardId, response.message, 'success');
    } catch (error) {
      console.error('Failed to save insight note:', error);
      showNotification(cardId, 'Failed to save note.', 'error');
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Proactive Synergy Intelligence</h2>
            <p className="text-sm text-slate-400">Discovering latent connections and strategic opportunities</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input value={noteQuery} onChange={e=>setNoteQuery(e.target.value)} placeholder="Filtro de notas (regex)" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200" />
          <input type="number" value={limit} min={1} max={50} onChange={e=>setLimit(parseInt(e.target.value))} className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200" />
          <label className="inline-flex items-center text-slate-300 text-sm mr-2">
            <input type="checkbox" checked={autoSave} onChange={e=>setAutoSave(e.target.checked)} className="mr-1" /> Auto-save
          </label>
        </div>
      </div>

      {/* Parâmetros avançados */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Temperatura: {temperature}</label>
          <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={e=>setTemperature(parseFloat(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Iterações</label>
          <input type="number" min={1} max={10} value={iterations} onChange={e=>setIterations(parseInt(e.target.value))} className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200" />
        </div>
        <div className="flex items-end justify-end">
          <button onClick={handleRefresh} disabled={isLoading} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait">
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">Template de Análise</label>
        <textarea value={template} onChange={e=>setTemplate(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded text-slate-200 px-2 py-1 font-mono text-sm" />
        <div className="mt-2 flex items-center space-x-2">
          <button onClick={()=>setTemplate('Analise o contexto e gere 1 insight estratégico acionável (oportunidade, risco ou recomendação). Use evidências do conteúdo.')} className="px-2 py-1 bg-slate-700 rounded text-slate-200 text-xs">Padrão</button>
          <button onClick={()=>setTemplate('Resuma em 3-5 bullets os principais aprendizados e implicações para o negócio.')} className="px-2 py-1 bg-slate-700 rounded text-slate-200 text-xs">Resumo</button>
          <button onClick={()=>setTemplate('Identifique riscos e oportunidades emergentes, com ações de mitigação e captura de valor.')} className="px-2 py-1 bg-slate-700 rounded text-slate-200 text-xs">Riscos & Oportunidades</button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center text-slate-400">Loading insights...</div>
        ) : error ? (
          <div className="text-center text-red-400">{error}</div>
        ) : insights.length === 0 ? (
          <div className="text-center text-slate-400">No new insights found.</div>
        ) : (
          insights.map((card) => {
            const config = typeConfig[card.type] || { icon: AlertTriangle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', label: 'Unknown Insight' };
            const Icon = config.icon;
            const isSelected = selectedCard === card.id;
            const isCurrentlySaving = isSaving === card.id;

            return (
              <div 
                key={card.id} 
                className={`border rounded-xl p-4 transition-all duration-300 cursor-pointer ${config.bg} ${config.border} hover:bg-opacity-20`}
                onClick={() => setSelectedCard(isSelected ? null : card.id)}
              > 
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}><Icon className={`h-4 w-4 ${config.color}`} /></div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-white font-medium">{card.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${urgencyColors[card.urgency] || 'bg-gray-500/20 text-gray-400'}`}>{(card.urgency || 'N/A').toUpperCase()}</span>
                      </div>
                      <span className={`text-xs ${config.color}`}>{config.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Confidence</div>
                      <div className={`text-sm font-medium ${config.color}`}>{card.confidence}%</div>
                    </div>
                    <Eye className={`h-4 w-4 ${isSelected ? config.color : 'text-slate-400'}`} />
                  </div>
                </div>

                <p className="text-slate-300 text-sm mb-3 leading-relaxed">{card.description}</p>

                {isSelected && (
                  <div className="border-t border-slate-700/50 pt-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Notas Relacionadas</h4>
                      <div className="flex flex-wrap gap-2">
                        {(card.relatedNotes || []).map((element, index) => (
                          <span key={index} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">{element}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Potential Impact</h4>
                      <p className="text-sm text-green-400">{card.potentialImpact}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button onClick={(e) => { e.stopPropagation(); handleExploreConnection(card.id); }} className="flex items-center space-x-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded-lg text-sm transition-colors"><Link2 className="h-3 w-3" /><span>Explore Connection</span></button>
                      <button onClick={(e) => { e.stopPropagation(); handleScheduleSession(card.id); }} className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded-lg text-sm transition-colors"><Calendar className="h-3 w-3" /><span>Schedule Session</span></button>
                      <button onClick={(e) => { e.stopPropagation(); handleCreateNote(card.id); }} disabled={isCurrentlySaving} className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isCurrentlySaving ? <Loader className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                        <span>{isCurrentlySaving ? 'Saving...' : 'Create Analysis Note'}</span>
                      </button>
                    </div>
                    {notification && notification.id === card.id && (
                      <div className={`mt-2 flex items-center text-xs ${notification.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {notification.type === 'success' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {notification.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* OBC Status */}
      {obcStatus && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-2">Obsidian Brain Cloud – Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
            <div>
              <div className="text-slate-400">Sincronização</div>
              <div>branch: {obcStatus.sync?.current_branch}</div>
              <div>pull: {String(obcStatus.sync?.pull_enabled)}</div>
              <div>push: {String(obcStatus.sync?.push_enabled)}</div>
              <div>uncommitted: {obcStatus.sync?.uncommitted_changes?.length || 0}</div>
            </div>
            <div>
              <div className="text-slate-400">Vault</div>
              <div>total_files: {obcStatus.vault?.total_files}</div>
              <div>sync_status: {obcStatus.vault?.sync_status}</div>
            </div>
            <div>
              <div className="text-slate-400">Mudanças recentes</div>
              <ul className="space-y-1 max-h-28 overflow-y-auto">
                {recentChanges.slice(0,6).map((f:any, idx:number)=>(
                  <li key={idx} className="truncate">{f.path || f.file_path}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas do Vault */}
      {vaultStats && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <Database className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{vaultStats.totalNotes}</div>
              <div className="text-xs text-slate-400">Notas</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <Link2 className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{vaultStats.totalLinks}</div>
              <div className="text-xs text-slate-400">Links</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <Hash className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{vaultStats.totalTags}</div>
              <div className="text-xs text-slate-400">Tags</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <BarChart3 className="h-5 w-5 text-orange-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{Object.keys(vaultStats.folderStats).length}</div>
              <div className="text-xs text-slate-400">Pastas</div>
            </div>
          </div>

          {vaultStats.topTags.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-slate-400 mb-2">Tags mais usadas:</div>
              <div className="flex flex-wrap gap-2">
                {vaultStats.topTags.slice(0, 5).map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">
                    #{tag.tag} ({tag.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {insights.length} {insights.length === 1 ? 'synergy discovered' : 'synergies discovered'} • Last scan: just now
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSyncVault}
              disabled={isSyncing}
              className="flex items-center space-x-2 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>{isSyncing ? 'Syncing...' : 'Sync Vault'}</span>
            </button>
            <button className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105">
              <Brain className="h-4 w-4" />
              <span>Deep Scan Knowledge Graph</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProactiveSynergyPanel;
