import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Loader2 } from 'lucide-react';
import { useAPI } from '../hooks/useAPI';
import toast from 'react-hot-toast';

// --- Interfaces ---
interface Model {
  id: string;
  name: string;
}

interface Agent {
  id?: string;
  name: string;
  type: string;
  schedule?: string | null;
  provider?: 'google' | 'openai' | string;
  model?: string;
  api_key?: string | null;
  config_json?: {
    prompt?: string; // legacy support
    prompt_template?: string;
    temperature?: number;
    tools?: string[];
    note_query?: string;
    note_limit?: number;
    iterations?: number;
  } | string;
}

interface AgentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Agent) => void;
  agent?: Agent | null;
}

// --- Componente ---
const AgentFormModal: React.FC<AgentFormModalProps> = ({ isOpen, onClose, onSave, agent }) => {
  const { t } = useLanguage();
  const api = useAPI();

  const getInitialState = (initialAgent?: Agent | null): Agent => {
    const config = typeof initialAgent?.config_json === 'string' 
      ? JSON.parse(initialAgent.config_json) 
      : initialAgent?.config_json;
    return {
      id: initialAgent?.id || undefined,
      name: initialAgent?.name || '',
      type: initialAgent?.type || 'knowledge_extractor',
      schedule: initialAgent?.schedule || 'Manual',
      provider: initialAgent?.provider || 'google',
      model: initialAgent?.model || 'gemini-1.5-pro',
      api_key: initialAgent?.api_key || '',
      config_json: {
        prompt_template: config?.prompt_template || config?.prompt || 'Analise o contexto e gere 1 insight estratégico acionável.',
        temperature: config?.temperature ?? 0.5,
        tools: Array.isArray(config?.tools) ? config?.tools : ['web_search'],
        note_query: config?.note_query || '',
        note_limit: config?.note_limit ?? 20,
        iterations: config?.iterations ?? 3,
      }
    };
  };

  const [formData, setFormData] = useState<Agent>(getInitialState(agent));
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const agentTemplates = {
    minerador_de_conhecimento: {
      name: 'Minerador de Conhecimento',
      type: 'minerador_de_conhecimento',
      provider: 'google',
      model: 'gemini-1.5-flash',
      config_json: {
        prompt_template: 'Analise o documento e extraia 5-10 entidades/conceitos estratégicos. Retorne uma lista de termos separados por vírgula.',
        temperature: 0.3,
        tools: ['web_search'],
        note_query: '',
        note_limit: 20,
        iterations: 3
      }
    },
    resumidor_de_notas: {
      name: 'Resumidor de Notas',
      type: 'resumidor_de_notas',
      provider: 'google',
      model: 'gemini-1.5-flash',
      config_json: {
        prompt_template: 'Leia o documento e crie um resumo conciso em 3-5 bullet points com as principais conclusões.',
        temperature: 0.5,
        tools: [],
        note_query: '',
        note_limit: 20,
        iterations: 1
      }
    },
    gerador_de_perguntas: {
      name: 'Gerador de Perguntas Estratégicas',
      type: 'gerador_de_perguntas',
      provider: 'google',
      model: 'gemini-1.5-pro',
      config_json: {
        prompt_template: 'Com base no documento, gere 3 perguntas estratégicas abertas que desafiem premissas e explorem implicações.',
        temperature: 0.7,
        tools: [],
        note_query: '',
        note_limit: 20,
        iterations: 1
      }
    },
    pesquisador_de_concorrentes: {
      name: 'Pesquisador de Concorrentes',
      type: 'pesquisador_de_concorrentes',
      provider: 'google',
      model: 'gemini-1.5-pro',
      config_json: {
        prompt_template: 'Identifique concorrentes no documento e use web_search para obter 2 notícias recentes por concorrente. Resuma impactos.',
        temperature: 0.6,
        tools: ['web_search','http_get'],
        note_query: 'concorrente|competidor',
        note_limit: 20,
        iterations: 3
      }
    }
  } as const;

  useEffect(() => {
    setFormData(getInitialState(agent));
    setModels([]); // Reseta os modelos ao abrir o modal
  }, [agent, isOpen]);

  if (!isOpen) return null;

  const handleTemplateSelect = (templateName: keyof typeof agentTemplates) => {
    const template = agentTemplates[templateName];
    if (!template) return;

    setFormData(prev => ({
      ...(prev || getInitialState(null)), 
      name: (prev?.name) || template.name, // Usa o nome do template
      type: template.type,
      provider: template.provider,
      model: template.model,
      config_json: template.config_json,
    }));
    document.getElementById('template-dropdown')?.classList.add('hidden');
  };

  const handleFetchModels = async () => {
    if (!formData.api_key) {
      toast.error("Por favor, insira uma chave de API.");
      return;
    }
    setIsLoadingModels(true);
    setModels([]);
    try {
      const fetchedModels = await api.listModels(formData.provider!, formData.api_key);
      setModels(fetchedModels);
      toast.success(`${fetchedModels.length} modelos carregados com sucesso!`);
    } catch (error) {
      console.error("Failed to fetch models:", error);
      toast.error("Falha ao carregar modelos. Verifique a chave e o provedor.");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (['prompt','prompt_template','temperature','note_query','note_limit','iterations'].includes(name)) {
      const currentConfig = typeof formData.config_json === 'object' ? formData.config_json as any : {};
      const parsed = (name === 'temperature') ? parseFloat(value)
                    : (name === 'note_limit' || name === 'iterations') ? parseInt(value) : value;
      // Map legacy 'prompt' input to 'prompt_template'
      const key = (name === 'prompt') ? 'prompt_template' : name;
      setFormData(prev => ({ ...prev, config_json: { ...currentConfig, [key]: parsed } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleToolToggle = (tool: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const currentConfig = typeof formData.config_json === 'object' ? (formData.config_json as any) : {};
    const currentTools: string[] = Array.isArray(currentConfig.tools) ? currentConfig.tools : [];
    const next = checked ? Array.from(new Set([...currentTools, tool])) : currentTools.filter(t => t !== tool);
    setFormData(prev => ({ ...prev, config_json: { ...currentConfig, tools: next } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const config = typeof formData.config_json === 'object' ? formData.config_json as any : { prompt_template: '', temperature: 0.5, tools: ['web_search'], note_query: '', note_limit: 20, iterations: 3 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{agent ? t('common.edit') : t('agent.create')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* --- Configurações Principais --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">{t('agent.name')}</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">{t('agent.type')}</label>
              <div className="flex items-center space-x-2">
                <input type="text" id="type" name="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ex: knowledge_extractor" />
                <div className="relative">
                  <button type="button" onClick={() => document.getElementById('template-dropdown')?.classList.toggle('hidden')} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm">Templates</button>
                  <div id="template-dropdown" className="hidden absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10">
                    <a onClick={() => handleTemplateSelect('minerador_de_conhecimento')} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 cursor-pointer">Minerador de Conhecimento</a>
                    <a onClick={() => handleTemplateSelect('resumidor_de_notas')} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 cursor-pointer">Resumidor de Notas</a>
                    <a onClick={() => handleTemplateSelect('gerador_de_perguntas')} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 cursor-pointer">Gerador de Perguntas</a>
                    <a onClick={() => handleTemplateSelect('pesquisador_de_concorrentes')} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 cursor-pointer">Pesquisador de Concorrentes</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- Configurações da IA --- */}
          <div className="border-t border-gray-700 pt-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="provider" className="block text-sm font-medium text-gray-300 mb-1">Provedor</label>
                <select id="provider" name="provider" value={formData.provider} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="google">Google Gemini</option>
                  <option value="openai" disabled>OpenAI (em breve)</option>
                </select>
              </div>
              <div>
                <label htmlFor="api_key" className="block text-sm font-medium text-gray-300 mb-1">Chave de API (Opcional)</label>
                <div className="flex items-center space-x-2">
                  <input type="password" id="api_key" name="api_key" value={formData.api_key || ''} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Usar chave global se vazio" />
                  <button type="button" onClick={handleFetchModels} disabled={isLoadingModels} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm flex items-center justify-center disabled:opacity-50">
                    {isLoadingModels ? <Loader2 className="animate-spin h-5 w-5" /> : "Carregar"}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-1">Modelo</label>
              {models.length > 0 ? (
                <select id="model" name="model" value={formData.model} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
                </select>
              ) : (
                <input type="text" id="model" name="model" value={formData.model} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          </div>
          
          {/* --- Prompt, Temperatura e Escopo --- */}
          <div className="border-t border-gray-700 pt-4 mb-4">
            <div>
              <label htmlFor="prompt_template" className="block text-sm font-medium text-gray-300 mb-1">Prompt do Agente</label>
              <textarea id="prompt_template" name="prompt_template" value={config.prompt_template} onChange={handleChange} rows={6} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"></textarea>
            </div>
            <div className="mt-4">
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-300 mb-1">Temperatura: {config.temperature}</label>
              <input type="range" id="temperature" name="temperature" min="0" max="1" step="0.1" value={config.temperature} onChange={handleChange} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="note_query" className="block text-sm font-medium text-gray-300 mb-1">Filtro de notas (regex)</label>
                <input type="text" id="note_query" name="note_query" value={config.note_query} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ex: Projeto|Estratégia" />
              </div>
              <div>
                <label htmlFor="note_limit" className="block text-sm font-medium text-gray-300 mb-1">Limite de notas</label>
                <input type="number" id="note_limit" name="note_limit" value={config.note_limit} onChange={handleChange} min={1} max={100} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white" />
              </div>
              <div>
                <label htmlFor="iterations" className="block text-sm font-medium text-gray-300 mb-1">Iterações máximas</label>
                <input type="number" id="iterations" name="iterations" value={config.iterations} onChange={handleChange} min={1} max={10} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white" />
              </div>
            </div>
          </div>

          {/* --- Ferramentas --- */}
          <div className="border-t border-gray-700 pt-4 mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Ferramentas Disponíveis</label>
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input id="tool_web_search" type="checkbox" className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-indigo-600 focus:ring-indigo-500" checked={config.tools?.includes('web_search')} onChange={handleToolToggle('web_search')} />
                <label htmlFor="tool_web_search" className="ml-2 block text-sm text-gray-300">Busca na Web</label>
              </div>
              <div className="flex items-center">
                <input id="tool_http_get" type="checkbox" className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-indigo-600 focus:ring-indigo-500" checked={config.tools?.includes('http_get')} onChange={handleToolToggle('http_get')} />
                <label htmlFor="tool_http_get" className="ml-2 block text-sm text-gray-300">HTTP GET</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-white bg-gray-600 hover:bg-gray-500">{t('common.cancel')}</button>
            <button type="submit" className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700">{t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentFormModal;
