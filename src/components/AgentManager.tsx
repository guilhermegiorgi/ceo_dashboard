import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAPI } from '../hooks/useAPI';
import toast from 'react-hot-toast';
import AgentFormModal from './AgentFormModal'; // Importa o novo modal

// Interface para tipar os dados de um agente
interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'running' | 'error';
  schedule: string | null;
  last_run_at: string | null;
}

const AgentManager: React.FC = () => {
  const { t } = useLanguage();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [runsAgentId, setRunsAgentId] = useState<string | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const api = useAPI();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await api.getAgents();
      setAgents(response || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      toast.error("Failed to load agents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingAgent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAgent(null);
  };

  const handleSaveAgent = async (agentData: Agent) => {
    const isCreating = !agentData.id;
    
    // Garante que o config_json seja uma string antes de enviar para a API
    const payload = {
      ...agentData,
      config_json: typeof agentData.config_json === 'object' 
        ? JSON.stringify(agentData.config_json) 
        : agentData.config_json,
    };

    const promise = isCreating 
      ? api.createAgent(payload) 
      : api.updateAgent(payload.id!, payload);

    toast.promise(promise, {
      loading: t(isCreating ? 'common.creating' : 'common.updating'),
      success: () => {
        fetchAgents();
        handleCloseModal();
        return t(isCreating ? 'common.create_success' : 'common.update_success');
      },
      error: t(isCreating ? 'common.create_error' : 'common.update_error'),
    });
  };

  const handleRun = async (id: string) => {
    toast.loading(`Executando agente ${id}...`, { id: `run-${id}` });
    try {
      const response = await api.runAgent(id);
      toast.success(response.data?.log || `Agente ${id} executado com sucesso!`, { id: `run-${id}` });
      fetchAgents();
    } catch (error) {
      console.error(`Failed to run agent ${id}:`, error);
      toast.error(`Falha ao executar o agente ${id}.`, { id: `run-${id}` });
    }
  };

  const handleViewRuns = async (agent: Agent) => {
    try {
      setRunsAgentId(agent.id);
      const data = await api.getAgentRuns(agent.id, 20);
      setRuns(data);
    } catch (e) {
      toast.error('Falha ao carregar execuções');
    }
  };

  const handleDelete = (agent: Agent) => {
    toast((toastInstance) => (
      <div className="flex flex-col items-center">
        <span className="mb-2 text-center">
          {t('common.delete_confirm_message', { item: agent.name })}
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              toast.dismiss(toastInstance.id);
              performDelete(agent.id);
            }}
            className="px-3 py-1 text-sm rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            {t('common.delete')}
          </button>
          <button
            onClick={() => toast.dismiss(toastInstance.id)}
            className="px-3 py-1 text-sm rounded-md text-white bg-gray-600 hover:bg-gray-500"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    ), { duration: 6000 });
  };

  const performDelete = (id: string) => {
    toast.promise(api.deleteAgent(id), {
      loading: t('common.deleting'),
      success: () => {
        fetchAgents();
        return t('common.delete_success');
      },
      error: t('common.delete_error'),
    });
  };

  if (loading) {
    return <div className="p-6 text-center">{t('common.loading')}</div>;
  }

  return (
    <>
      <div className="p-6 bg-gray-900 text-white min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t('agent.panelTitle')}</h1>
          <button 
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {t('agent.create')}
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('agent.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('agent.type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('agent.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('agent.schedule')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('agent.lastRun')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('agent.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {agents.length > 0 ? agents.map(agent => (
                <tr key={agent.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{agent.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{agent.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      agent.status === 'active' ? 'bg-green-900 text-green-300' : 
                      agent.status === 'running' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{agent.schedule || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{agent.last_run_at ? new Date(agent.last_run_at).toLocaleString() : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleRun(agent.id)} className="text-indigo-400 hover:text-indigo-300 mr-3">{t('agent.runNow')}</button>
                    <button onClick={() => handleViewRuns(agent)} className="text-sky-400 hover:text-sky-300 mr-3">Runs</button>
                    <button onClick={() => handleOpenEditModal(agent)} className="text-indigo-400 hover:text-indigo-300 mr-3">{t('common.edit')}</button>
                    <button onClick={() => handleDelete(agent)} className="text-red-500 hover:text-red-400">{t('common.delete')}</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Nenhum agente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AgentFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAgent}
        agent={editingAgent}
      />

      {/* Runs Modal */}
      {runsAgentId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Últimas execuções</h3>
              <button onClick={() => { setRunsAgentId(null); setRuns([]); }} className="text-gray-400 hover:text-white">Fechar</button>
            </div>
            <table className="min-w-full text-sm text-gray-300">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Início</th>
                  <th className="px-3 py-2 text-left">Término</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Log</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r:any) => (
                  <tr key={r.id} className="border-b border-gray-700">
                    <td className="px-3 py-2">{r.start_time}</td>
                    <td className="px-3 py-2">{r.end_time || '-'}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 truncate max-w-[24rem]">{r.log}</td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">Sem execuções recentes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default AgentManager;
