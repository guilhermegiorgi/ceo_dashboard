import React, { useState, useRef, useEffect } from 'react';
import { Send, Save, Database, Brain, Settings } from 'lucide-react';
import apiClient from '../services/apiClient';
import AIMessageContent from './AIMessageContent';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  thinking?: string; // Para armazenar o processo de raciocínio
}



const ConversationalHub: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  // Contexto do OBC
  const [useBrainContext, setUseBrainContext] = useState(true);
  const [noteQuery, setNoteQuery] = useState('');
  const [noteLimit, setNoteLimit] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  
  // Thinking e Modelo
  const [thinkingMode, setThinkingMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [showThinking, setShowThinking] = useState<{[key: number]: boolean}>({});
  // Carregar modelos
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await apiClient.getAIProviders();
        const models = response.data || [];
        setAvailableModels(models);
        if (models.length > 0 && !selectedModel) {
          const defaultModel = models.find((m: any) => m.is_default) || models[0];
          setSelectedModel(defaultModel.model_id || '');
        }
      } catch (error) {
        console.error('Failed to load AI models:', error);
      }
    };
    loadModels();
  }, []);

  // Persist settings
  useEffect(() => {
    try {
      const ns = 'chat.';
      const ub = localStorage.getItem(ns+'useBrainContext');
      const nq = localStorage.getItem(ns+'noteQuery');
      const nl = localStorage.getItem(ns+'noteLimit');
      const tm = localStorage.getItem(ns+'thinkingMode');
      const sm = localStorage.getItem(ns+'selectedModel');
      if (ub !== null) setUseBrainContext(ub === 'true');
      if (nq !== null) setNoteQuery(nq);
      if (nl !== null) setNoteLimit(parseInt(nl));
      if (tm !== null) setThinkingMode(tm === 'true');
      if (sm !== null) setSelectedModel(sm);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const ns = 'chat.';
      localStorage.setItem(ns+'useBrainContext', String(useBrainContext));
      localStorage.setItem(ns+'noteQuery', noteQuery);
      localStorage.setItem(ns+'noteLimit', String(noteLimit));
      localStorage.setItem(ns+'thinkingMode', String(thinkingMode));
      localStorage.setItem(ns+'selectedModel', selectedModel);
    } catch {}
  }, [useBrainContext, noteQuery, noteLimit, thinkingMode, selectedModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiMessageId = Date.now() + 1;
    setMessages(prev => [...prev, { id: aiMessageId, text: '', thinking: '', sender: 'ai' }]);
    
    // Initialize thinking visibility
    setShowThinking(prev => ({ ...prev, [aiMessageId]: thinkingMode }));

    const sessionId = 'ceo-dashboard-session'; // Or generate a unique one

    // Monta prompt com contexto do OBC quando habilitado e thinking mode
    let prompt = input;
    let systemInstructions = '';
    
    if (thinkingMode) {
      systemInstructions += `
# Thinking Mode Protocol
You MUST structure your response in two clear parts when thinking mode is enabled:
1. **PROCESSO DE RACIOCÍNIO**: Step-by-step analysis, premises, sources from Brain Cloud
2. **RESPOSTA FINAL**: Direct, actionable answer following AGENTIC mode

Use EXACT format:
---
🧠 **PROCESSO DE RACIOCÍNIO:**
[Step-by-step reasoning with Brain Cloud data analysis]

📝 **RESPOSTA FINAL:**
[Direct, decisive answer]
---

BE DECISIVE - trust your gut, go with obvious option immediately!
`;
    }
    
    if (useBrainContext) {
      try {
        const notesResp = await apiClient.searchVaultNotes(noteQuery || '', undefined, noteLimit, true);
        const items = notesResp?.data || notesResp || [];
        const parts: string[] = [];
        for (const n of items) {
          if (!n?.content) continue;
          const header = `# ${n.path || n.basename || 'Nota'}\n`;
          const snippet = String(n.content).substring(0, 1500);
          parts.push(header + snippet);
        }
        const context = parts.join('\n\n---\n\n');
        const baseSystem = 'Você é um advisor estratégico. Use o contexto das notas abaixo para responder de forma objetiva e acionável. Se houver incerteza, explicite as premissas.';
        prompt = `${baseSystem}${systemInstructions}\n\n[CONTEXT]\n${context}\n\n[QUESTION]\n${input}`;
      } catch (e) {
        console.warn('Falha ao obter contexto do OBC:', e);
        if (thinkingMode) {
          prompt = `Você é um advisor estratégico.${systemInstructions}\n\n[QUESTION]\n${input}`;
        }
      }
    } else if (thinkingMode) {
      prompt = `Você é um advisor estratégico.${systemInstructions}\n\n[QUESTION]\n${input}`;
    }

    await apiClient.queryCognitoStream(
      prompt,
      sessionId,
      (chunk: string) => {
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id !== aiMessageId) return msg;
            
            // Process thinking separation with enhanced regex
            if (thinkingMode) {
              const currentText = msg.text + chunk;
              
              // Check if we have both thinking and content using enhanced regex
              const thinkingMatch = currentText.match(/🧠\s*\*\*PROCESSO DE RACIOCÍNIO:\*\*([^]*?)📝\s*\*\*RESPOSTA FINAL:\*\*([^]*)/s);
              
              if (thinkingMatch) {
                let [, thinkingContent, finalContent] = thinkingMatch;
                
                // Clean up the content
                thinkingContent = thinkingContent
                  .replace(/^[-\s]*|[-\s]*$/g, '') // Remove leading/trailing dashes and spaces
                  .trim();
                  
                finalContent = finalContent
                  .replace(/^[-\s]*|[-\s]*$/g, '') // Remove leading/trailing dashes and spaces  
                  .trim();
                
                return {
                  ...msg,
                  thinking: thinkingContent,
                  text: finalContent
                };
              }
              
              // Still building the message, add chunk normally
              return { ...msg, text: currentText };
            }
            
            // Normal mode without thinking
            return { ...msg, text: msg.text + chunk };
          })
        );
      },
      (error: Error) => {
        console.error('Streaming error:', error);
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: 'Ocorreu um erro ao processar sua pergunta.' } : msg
          )
        );
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );
  };

  const handleSaveLastAI = async () => {
    const last = [...messages].reverse().find(m => m.sender === 'ai' && m.text.trim().length > 0);
    if (!last) return;
    setSaving(true);
    try {
      const title = last.text.split('\n')[0].substring(0, 80) || 'Insight de Conversa';
      const content = `# ${title}\n\n${last.text}`;
      await apiClient.createVaultNote(title, content, 'INSIGHTS DO VAULT');
    } catch (e) {
      console.error('Falha ao salvar nota do chat:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg h-full flex flex-col p-4 shadow-lg">

      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-lg px-4 py-2 max-w-lg ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
              {msg.sender === 'ai' ? (
                <>
                  {msg.thinking && (showThinking[msg.id] !== false) && (
                    <div className="bg-slate-800 rounded-md p-3 mb-3 text-xs text-slate-400 border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-400">🧠 Processo de Raciocínio Agentic:</span>
                        <button
                          onClick={() => setShowThinking(prev => ({...prev, [msg.id]: false}))}
                          className="text-slate-500 hover:text-slate-300 text-xs"
                        >
                          Ocultar
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap text-slate-300">{msg.thinking}</div>
                    </div>
                  )}
                  <AIMessageContent text={msg.text} />
                  {msg.thinking && showThinking[msg.id] === false && (
                    <button
                      onClick={() => setShowThinking(prev => ({...prev, [msg.id]: true}))}
                      className="text-xs text-purple-400 hover:text-purple-300 mt-2"
                    >
                      🧠 Mostrar raciocínio agentic
                    </button>
                  )}
                </>
              ) : msg.text}
              {msg.id === messages[messages.length - 1].id && isLoading && msg.sender === 'ai' && (
                <span className="inline-block w-2 h-2 ml-2 bg-slate-400 rounded-full animate-pulse"></span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4 flex items-center flex-wrap gap-2">
        {/* Controles de contexto */}
        <label className="inline-flex items-center text-slate-300 text-sm mr-2">
          <input type="checkbox" className="mr-1" checked={useBrainContext} onChange={e=>setUseBrainContext(e.target.checked)} />
          Usar contexto do Segundo Cérebro
        </label>

        {/* Controle Thinking */}
        <label className="inline-flex items-center text-slate-300 text-sm mr-2">
          <input type="checkbox" className="mr-1" checked={thinkingMode} onChange={e=>setThinkingMode(e.target.checked)} />
          <Brain className="h-4 w-4 mr-1" />
          Modo Thinking
        </label>

        {/* Seleção de Modelo */}
        {availableModels.length > 0 && (
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4 text-slate-400" />
            <select
              value={selectedModel}
              onChange={e=>setSelectedModel(e.target.value)}
              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
            >
              {availableModels.map((model: any) => (
                <option key={model.model_id} value={model.model_id}>
                  {model.display_name || model.model_id}
                </option>
              ))}
            </select>
          </div>
        )}

        {useBrainContext && (
          <>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-slate-400" />
              <input value={noteQuery} onChange={e=>setNoteQuery(e.target.value)} placeholder="Filtro de notas (regex)" className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200" />
              <input type="number" value={noteLimit} min={1} max={20} onChange={e=>setNoteLimit(parseInt(e.target.value))} className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200" />
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Pergunte algo ao seu Segundo Cérebro..."
          className="flex-grow bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading}
          className="ml-2 bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Send className="h-5 w-5" />
        </button>
        <button
          onClick={handleSaveLastAI}
          disabled={saving}
          className="ml-2 bg-slate-700 text-slate-200 rounded-md px-3 py-2 hover:bg-slate-600 disabled:opacity-50"
          title="Salvar última resposta como nota"
        >
          <Save className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ConversationalHub;
