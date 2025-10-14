# Redesign da Integração de Chat - Arquitetura Contextual

## Visão Geral

Transformar o chat de uma página separada em uma experiência integrada e contextual dentro do dashboard principal, seguindo o padrão ChatGPT/Claude/Vectal.

## Problema Atual

❌ **Chat como página separada** (`/chat`)
- Usuário perde o contexto visual do dashboard
- Histórico de conversas isolado
- Sem integração com projetos/notas/hierarquia do vault
- Experiência fragmentada

## Nova Arquitetura Proposta

### 1. **Segundo Bloco (Timeline) → Área de Conversação Principal**

**Estado Inicial:**
```
┌─────────────────────────────────────┐
│ Timeline / Insights                 │
│                                     │
│ • Weekly Focus                      │
│ • Context Cards                     │
│ • Agent Runs                        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Sparkles] Digite sua mensagem...│ │
│ │ [Mic] [File] [Play]             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Ao Iniciar Chat:**
```
┌─────────────────────────────────────┐
│ [User] Preciso criar tarefas pro X │
│                                     │
│ [Assistant] Claro! Vou te ajudar...│
│ • Tarefa 1                          │
│ • Tarefa 2                          │
│                                     │
│ [User] Adicione mais detalhes       │
│                                     │
│ [Assistant] [Streaming...]          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Sparkles] Continue a conversa...│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. **Sidebar → Histórico de Conversas**

Substituir a opção "Chat" por uma seção expansível de conversas:

```
Focus
  🔥 Today

Conversas ▼
  💬 Tarefas do Projeto X          (2min)
  💬 Review semanal agronegócio    (1h)
  💬 Insights sobre IA             (hoje)

  + Nova conversa

Projetos ▼
  📁 Projeto A
  📁 Projeto B
```

**Funcionalidades:**
- ✅ Título gerado automaticamente pela IA na primeira interação
- ✅ Timestamp relativo (2min, 1h, hoje, ontem)
- ✅ Ao clicar, carrega a conversa no segundo bloco
- ✅ Botão "+" cria nova conversa (limpa o timeline)
- ✅ Organização cronológica (mais recentes primeiro)
- ✅ Agrupamento: Hoje, Últimos 7 dias, Últimos 30 dias, Mais antigo

### 3. **Terceiro Bloco (Auxiliar) → Contexto & Notas**

O painel direito (atualmente "Painel Operacional") mostra:

**Durante uma Conversa:**
```
┌─────────────────────────────────┐
│ 📚 Contexto da Conversa         │
├─────────────────────────────────┤
│                                 │
│ 📁 Projeto Ativo                │
│   └─ Projeto X                  │
│                                 │
│ 📝 Notas Relacionadas (3)       │
│   • nota-reuniao-semanal.md     │
│   • tarefas-pendentes.md        │
│   • escopo-projeto-x.md         │
│                                 │
│ 🏷️ Tags Detectadas              │
│   #projeto-x #agronegócio       │
│                                 │
│ 🔗 Links Úteis                  │
│   → Dashboard do Projeto        │
│   → Knowledge Graph             │
│                                 │
└─────────────────────────────────┘
```

### 4. **Chat Contextual Baseado em Hierarquia**

#### 4.1 Detecção Automática de Contexto

**Cenário 1: Chat dentro de um Projeto**
```javascript
// Usuário está em: /?collection=projeto-x
// Chat detecta contexto automaticamente

prompt = `
Você é o Cognito, assistente do projeto "${projectName}".

Contexto do Projeto:
- Nome: ${project.name}
- Descrição: ${project.description}
- Tarefas ativas: ${project.activeTasks}
- Notas relacionadas: ${project.notes}

Pergunta do usuário: ${userMessage}

Responda considerando o contexto deste projeto específico.
`;
```

**Cenário 2: Chat dentro de uma Nota**
```javascript
// Usuário abriu nota específica
// Chat tem contexto da nota atual

prompt = `
Você está analisando a nota: ${currentNote.path}

Conteúdo da nota:
${currentNote.content}

Frontmatter:
${currentNote.frontmatter}

Links outgoing:
${currentNote.links}

Pergunta do usuário: ${userMessage}
`;
```

**Cenário 3: Chat Global (Dashboard)**
```javascript
// Sem contexto específico
// Usa foco semanal + notas recentes

prompt = `
Você é o Cognito, assistente estratégico.

Foco Semanal:
${weeklyFocus}

Contexto recente:
${recentNotes}

Pergunta do usuário: ${userMessage}
`;
```

#### 4.2 Comandos Contextuais

Quando o chat está dentro de um projeto:

- `/task` → Cria tarefa no projeto atual
- `/note` → Cria nota linkada ao projeto
- `/summary` → Resume o projeto atual
- `/status` → Status do projeto

## Implementação Técnica

### Fase 1: Estrutura de Dados

#### 1.1 Modelo de Conversa

```typescript
interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  context?: {
    projectId?: string;
    noteId?: string;
    tags?: string[];
  };
}

interface Conversation {
  id: string;
  title: string; // Gerado pela IA
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  context: {
    type: "project" | "note" | "global";
    projectId?: string;
    notePath?: string;
  };
  metadata: {
    messageCount: number;
    lastMessage: string;
    tags: string[];
  };
}
```

#### 1.2 Backend Endpoints

```javascript
// server/routes/conversations.js

// Listar conversas (para sidebar)
GET /api/conversations
Response: {
  conversations: [
    {
      id: "conv-123",
      title: "Tarefas do Projeto X",
      lastMessage: "Perfeito, vou criar essas tarefas",
      updatedAt: "2025-10-13T20:30:00Z",
      messageCount: 8,
      context: { type: "project", projectId: "proj-x" }
    }
  ]
}

// Criar nova conversa
POST /api/conversations
Body: {
  context: {
    type: "project",
    projectId: "proj-x"
  }
}

// Obter conversa completa
GET /api/conversations/:id
Response: {
  conversation: {
    id: "conv-123",
    title: "...",
    messages: [...],
    context: {...}
  }
}

// Enviar mensagem com streaming
POST /api/conversations/:id/messages
Body: {
  content: "Preciso criar tarefas",
  context: {
    projectId: "proj-x"
  }
}
Response: Stream (SSE)

// Gerar título automaticamente
POST /api/conversations/:id/generate-title
Body: {
  messages: [/* primeiras 3-5 mensagens */]
}
Response: {
  title: "Criação de tarefas para Projeto X"
}
```

### Fase 2: Componentes Frontend

#### 2.1 Refatorar BusinessIntelligenceHub

**Estado Atual:**
- Timeline com cards estáticos
- Input simples no rodapé

**Novo Estado:**
```typescript
const [chatMode, setChatMode] = useState<"timeline" | "conversation">("timeline");
const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [streamingMessage, setStreamingMessage] = useState<string>("");
```

**Renderização Condicional:**
```jsx
{chatMode === "timeline" ? (
  <TimelineView
    cards={timelineCards}
    onStartChat={handleStartChat}
  />
) : (
  <ConversationView
    conversation={activeConversation}
    messages={messages}
    streamingMessage={streamingMessage}
    onSendMessage={handleSendMessage}
    onBackToTimeline={handleBackToTimeline}
  />
)}
```

#### 2.2 Novo Componente: ConversationView

```tsx
// src/components/ConversationView.tsx

interface ConversationViewProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  streamingMessage: string;
  onSendMessage: (content: string) => void;
  onBackToTimeline: () => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  messages,
  streamingMessage,
  onSendMessage,
  onBackToTimeline
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <button onClick={onBackToTimeline}>
          <ChevronLeft /> Voltar para Timeline
        </button>
        <h3>{conversation?.title || "Nova Conversa"}</h3>
        <div>
          {conversation?.context.type === "project" && (
            <span>📁 {conversation.context.projectId}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {streamingMessage && (
          <MessageBubble
            message={{
              role: "assistant",
              content: streamingMessage,
              timestamp: new Date()
            }}
            streaming
          />
        )}
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <MessageInput onSend={onSendMessage} />
      </div>
    </div>
  );
};
```

#### 2.3 Atualizar NavigationSidebar

```tsx
// src/components/NavigationSidebar.tsx

// Remover: { label: 'Chat', path: '/chat', icon: Command }

// Adicionar seção de conversas:
const [conversations, setConversations] = useState<Conversation[]>([]);
const [conversationsExpanded, setConversationsExpanded] = useState(true);

<div className="nav-section">
  <button onClick={() => setConversationsExpanded(!conversationsExpanded)}>
    Conversas {conversationsExpanded ? "▼" : "▶"}
  </button>

  {conversationsExpanded && (
    <>
      {conversations.map(conv => (
        <button
          key={conv.id}
          onClick={() => handleOpenConversation(conv.id)}
          className={cn("nav-item", {
            active: activeConversation?.id === conv.id
          })}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="truncate">{conv.title}</span>
          <span className="text-xs text-zinc-500">
            {formatRelativeTime(conv.updatedAt)}
          </span>
        </button>
      ))}

      <button onClick={handleNewConversation} className="nav-item-new">
        <Plus className="h-4 w-4" />
        Nova conversa
      </button>
    </>
  )}
</div>
```

#### 2.4 Painel de Contexto (Terceiro Bloco)

```tsx
// Quando chatMode === "conversation"
{chatMode === "conversation" && activeConversation && (
  <ContextPanel
    conversation={activeConversation}
    relatedNotes={contextNotes}
    detectedTags={detectedTags}
    onNavigateToNote={handleNavigateToNote}
  />
)}
```

### Fase 3: Geração Automática de Títulos

#### 3.1 Backend - Geração de Título via IA

```javascript
// server/services/conversationService.js

async function generateConversationTitle(messages) {
  // Pega as primeiras 3-5 mensagens
  const firstMessages = messages.slice(0, 5);

  const prompt = `
Analise esta conversa e gere um título curto e descritivo (máx 50 caracteres).

Conversa:
${firstMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Título sugerido:
`;

  const title = await cognitoService.generateText(prompt);
  return title.trim();
}
```

#### 3.2 Trigger Automático

```javascript
// Após a segunda mensagem do usuário, gera título automaticamente
async function handleNewMessage(conversationId, message) {
  await saveMessage(conversationId, message);

  const conversation = await getConversation(conversationId);
  const userMessages = conversation.messages.filter(m => m.role === "user");

  // Se é a segunda mensagem do usuário e ainda não tem título customizado
  if (userMessages.length === 2 && conversation.title.startsWith("Nova Conversa")) {
    const title = await generateConversationTitle(conversation.messages);
    await updateConversationTitle(conversationId, title);

    // Notifica frontend via WebSocket
    io.to(conversationId).emit("conversation:title-updated", { title });
  }
}
```

### Fase 4: Contexto Hierárquico

#### 4.1 Detecção de Contexto

```typescript
// src/hooks/useChatContext.ts

export function useChatContext() {
  const location = useLocation();
  const [context, setContext] = useState<ChatContext | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const collectionId = params.get("collection");
    const noteId = params.get("note");

    if (collectionId) {
      // Contexto de projeto
      fetchProjectContext(collectionId).then(setContext);
    } else if (noteId) {
      // Contexto de nota
      fetchNoteContext(noteId).then(setContext);
    } else {
      // Contexto global
      setContext({ type: "global" });
    }
  }, [location]);

  return context;
}
```

#### 4.2 Construção de Prompt Contextual

```typescript
// src/services/chatService.ts

function buildContextualPrompt(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[]
) {
  let systemPrompt = "Você é Cognito, assistente estratégico.\n\n";

  switch (context.type) {
    case "project":
      systemPrompt += `
Contexto: Você está assistindo o usuário no projeto "${context.project.name}".

Informações do Projeto:
- Descrição: ${context.project.description}
- Status: ${context.project.status}
- Tarefas ativas: ${context.project.tasks.length}
- Última atualização: ${context.project.updatedAt}

Notas relacionadas:
${context.relatedNotes.map(n => `- ${n.title}`).join('\n')}

Quando o usuário pedir para criar tarefas, mencione explicitamente que elas serão criadas no contexto deste projeto.
`;
      break;

    case "note":
      systemPrompt += `
Contexto: Você está analisando a nota "${context.note.title}".

Conteúdo:
${context.note.content}

Frontmatter:
${JSON.stringify(context.note.frontmatter, null, 2)}

Links relacionados:
${context.note.links.map(l => `- [[${l}]]`).join('\n')}
`;
      break;

    case "global":
      systemPrompt += `
Contexto: Dashboard principal

Foco semanal:
${context.weeklyFocus}

Notas recentes:
${context.recentNotes.map(n => `- ${n.title} (${n.date})`).join('\n')}
`;
      break;
  }

  // Adiciona histórico da conversa
  if (conversationHistory.length > 0) {
    systemPrompt += `\n\nHistórico da conversa:\n`;
    conversationHistory.forEach(msg => {
      systemPrompt += `${msg.role}: ${msg.content}\n`;
    });
  }

  systemPrompt += `\nPergunta atual do usuário:\n${userMessage}`;

  return systemPrompt;
}
```

## Fluxo de Implementação

### Sprint 1: Backend & Database (2-3 dias)
1. ✅ Criar tabela `conversations` no PostgreSQL
2. ✅ Criar tabela `conversation_messages`
3. ✅ Implementar endpoints CRUD para conversas
4. ✅ Implementar streaming SSE para mensagens
5. ✅ Implementar geração automática de títulos
6. ✅ Adicionar WebSocket para notificações em tempo real

### Sprint 2: Frontend Core (3-4 dias)
1. ✅ Criar componente `ConversationView`
2. ✅ Criar componente `MessageBubble`
3. ✅ Criar componente `MessageInput`
4. ✅ Refatorar `BusinessIntelligenceHub` para suportar modo conversa
5. ✅ Implementar switch entre Timeline e Conversa
6. ✅ Implementar streaming de respostas

### Sprint 3: Sidebar & Histórico (2 dias)
1. ✅ Atualizar `NavigationSidebar` com seção de conversas
2. ✅ Implementar carregamento de conversas
3. ✅ Implementar criação de nova conversa
4. ✅ Implementar formatação de timestamps relativos
5. ✅ Implementar agrupamento por período

### Sprint 4: Contexto & Integração (3-4 dias)
1. ✅ Criar hook `useChatContext`
2. ✅ Implementar detecção de contexto (projeto/nota/global)
3. ✅ Criar `ContextPanel` no terceiro bloco
4. ✅ Implementar busca de notas relacionadas
5. ✅ Implementar detecção de tags
6. ✅ Integrar contexto com geração de prompts

### Sprint 5: Comandos & Ações (2-3 dias)
1. ✅ Implementar parser de comandos (`/task`, `/note`, etc)
2. ✅ Implementar ações contextuais
3. ✅ Integrar com APIs de criação de tarefas/notas
4. ✅ Implementar feedback visual de ações

### Sprint 6: Polimento & Remoção (1-2 dias)
1. ✅ Remover `ChatPage.tsx`
2. ✅ Remover rota `/chat` do router
3. ✅ Atualizar navegação para não referenciar chat page
4. ✅ Testes end-to-end
5. ✅ Ajustes de UI/UX

## Estimativa Total
**15-18 dias de desenvolvimento**

## Benefícios da Nova Arquitetura

✅ **Experiência Unificada:** Tudo acontece no dashboard principal
✅ **Contextual:** Chat entende onde o usuário está (projeto, nota, global)
✅ **Histórico Integrado:** Conversas na sidebar como ChatGPT/Claude
✅ **Títulos Inteligentes:** IA gera títulos automaticamente
✅ **Ações Contextuais:** Criar tarefas/notas no projeto correto
✅ **Menos Cliques:** Não precisa navegar para outra página
✅ **Melhor para Vault:** Respeita hierarquia e organização do Obsidian

## Próximos Passos Imediatos

1. Criar schema do banco de dados para conversas
2. Implementar endpoints básicos de conversas
3. Criar componente `ConversationView` básico
4. Testar fluxo end-to-end simples
5. Iterar com feedback do usuário
