'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, Loader2, Search } from 'lucide-react';
import apiClient from '../services/apiClient';

interface Conversation {
  conversation_id: string;
  score?: number;
  timestamp: string;
  note_path?: string;
  content: string;
  role: string;
}

interface ConversationHistoryProps {
  onSelect: (conversationId: string) => void;
  collapsed?: boolean;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ 
  onSelect, 
  collapsed = false 
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(!collapsed);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getRecentConversations(20);
      
      // Agrupa conversas por ID e pega a primeira mensagem de cada
      const groupedConversations = new Map();
      
      if (response.conversations) {
        response.conversations.forEach((conv: Conversation) => {
          if (!groupedConversations.has(conv.conversation_id)) {
            groupedConversations.set(conv.conversation_id, {
              ...conv,
              formattedDate: new Date(conv.timestamp).toLocaleDateString('pt-BR'),
              preview: conv.content?.substring(0, 80) + (conv.content?.length > 80 ? '...' : '')
            });
          }
        });
      }
      
      setConversations(Array.from(groupedConversations.values()).slice(0, 10));
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.conversation_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (collapsed) {
    return null;
  }

  return (
    <div className="mx-2 mb-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-zinc-400 transition hover:border-neutral-700 hover:bg-neutral-900/80"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-xs font-medium">Histórico de Conversas</span>
        </div>
        <Clock className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Content */}
      {expanded && (
        <div className="mt-2 space-y-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 px-2 py-1 pl-7 text-xs text-zinc-300 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Conversations List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                <span className="ml-2 text-xs text-zinc-500">Carregando...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-zinc-500">
                  {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa recente'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.conversation_id}
                  onClick={() => onSelect(conv.conversation_id)}
                  className="w-full rounded-lg border border-transparent bg-neutral-900/30 px-3 py-2 text-left transition hover:border-neutral-700 hover:bg-neutral-900/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-300">
                        {conv.preview}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {conv.formattedDate}
                      </p>
                    </div>
                    {conv.score && (
                      <span className="text-xs text-zinc-500">
                        {Math.round((conv.score || 0) * 100)}%
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadConversations}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/30 px-3 py-1 text-xs text-zinc-500 transition hover:border-neutral-700 hover:bg-neutral-900/60"
          >
            Atualizar
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;
