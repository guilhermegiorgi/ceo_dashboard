import React from 'react';
import { Sparkles } from 'lucide-react';
import CognitoChat from '../components/CognitoChat';

const ChatPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col gap-4">
      <header className="rounded-2xl border border-neutral-800 bg-neutral-950/80 px-6 py-4 shadow-lg shadow-black/40">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Assistente Cognitivo</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Converse com agentes treinados no seu Segundo Cérebro. As respostas usam notas, decisões e contexto do Brain Cloud com ferramentas MCP.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <CognitoChat />
      </div>
    </div>
  );
};

export default ChatPage;
