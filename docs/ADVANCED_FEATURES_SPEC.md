# Especificação de Funcionalidades Avançadas: CEO Dashboard v2

## Visão Geral: O "Sistema Operacional" do CEO
Este documento define as funcionalidades avançadas para a versão 2.0 do Dashboard, evoluindo de um painel passivo para um **Workspace Chat-First** inspirado no Vectal.ai. O sistema utiliza o **Segundo Cérebro (Obsidian)** como fonte única de verdade e motor de inteligência.

---

## 1. A Interface "Brain" (Chat-First UX)
A principal forma de interação não é mais o clique, mas o diálogo. O chat é o comando central que orquestra todo o sistema.

### 1.1. Chat Contextual & "Thinking Mode"
- **Cadeia de Pensamento Visível:** O sistema exibe seu raciocínio em blocos colapsáveis ("Thinking..."), permitindo auditoria da lógica antes da resposta final.
- **Contexto Dinâmico:** O chat sabe onde você está. Se você está na página de "Projetos", ele prioriza ferramentas de gestão. Se está no "Diário", prioriza reflexão.
- **Memória de Longo Prazo:** Utiliza `save_conversation_history` e `search_conversation_history` para lembrar decisões passadas, preferências e contextos de semanas atrás.

### 1.2. Generative UI (Interface Generativa)
Em vez de respostas apenas em texto, a IA renderiza componentes de UI interativos (via Vercel AI SDK `tool-call`):
- **Task Cards:** Quando a IA sugere tarefas, ela renderiza cartões interativos (com checkbox e data) em vez de uma lista de texto.
- **Graph Snippets:** Ao explicar uma conexão entre ideias, ela exibe um mini-grafo visual (`get_graph_data`).
- **Markdown Live Preview:** Ao redigir um conteúdo, ela mostra o preview renderizado em tempo real.

---

## 2. Integração Profunda com Segundo Cérebro (MCP)
O Obsidian não é apenas um armazenamento, é o "Backend" vivo do sistema.

### 2.1. Smart Task Radar (Priorização via IA)
Inspirado no Vectal.ai, mas alimentado pelo seu cofre:
- **Agregação Inteligente:** Combina tarefas de `get_due_tasks` (Obsidian) com tarefas inferidas de conversas recentes.
- **Matriz de Prioridade:** A IA classifica tarefas não apenas por data, mas por "Impacto Estratégico" (analisando o conteúdo da tarefa e notas relacionadas).
- **Visualização Radar:** Um gráfico ou quadro Kanban que separa:
    - *Crítico/Hoje* (Foco Imediato)
    - *Estratégico* (Alto valor, sem urgência)
    - *Backlog* (Para depois)

### 2.2. Vault Pulse (O Pulso do Conhecimento)
Uma visualização em tempo real da atividade do seu cérebro digital:
- **Feed de Atividade:** Mostra notas editadas recentemente (`get_recent_changes`), mas agrupadas por "Tópico" ou "Projeto" (usando `get_main_tags`).
- **Detecção de Ressonância:** Se você editou 3 notas sobre "IA" e 2 sobre "Automação", o sistema sugere uma conexão ou "Sessão de Sinergia".

### 2.3. Quick Capture (Captura Sem Fricção)
- **Atalho Global (Cmd+K / Q):** Abre um modal minimalista em qualquer lugar do dashboard.
- **Roteamento Inteligente:** Você digita o pensamento, e a IA decide onde salvar:
    - É uma tarefa? -> `Tasks/Inbox.md`
    - É uma ideia? -> `5 - INSIGHTS-IA/Inbox/QuickCapture.md`
    - É uma referência? -> Cria nova nota em `Resources/`.

---

## 3. Widgets do "Cockpit" (Dashboard)
O painel inicial é o "Head-Up Display" (HUD) do CEO.

### 3.1. Focus Widget (O "One Big Thing")
- **Fonte:** Extraído automaticamente da sua Nota Diária (`get_periodic_note`) ou definido manualmente.
- **Visual:** Destaque absoluto no topo da tela. Nada compete com o Foco do Dia.
- **Modo "Deep Work":** Um botão que esconde todos os outros widgets e deixa apenas o Foco e o Chat.

### 3.2. Memory Search (Busca Semântica Global)
- **Busca Unificada:** Uma barra de busca que consulta:
    1.  Suas Notas (Obsidian)
    2.  Suas Conversas Passadas (Memória do Chat)
    3.  Suas Tarefas
- **Resultados Híbridos:** Mostra "A resposta da IA" (sintetizada) junto com "Fontes Originais" (links para notas).

### 3.3. Graph View Widget
- **Navegação Visual:** Um widget interativo que mostra a nota atual (ou foco do dia) e seus vizinhos imediatos no grafo.
- **Exploração Serendipitous:** Permite "caminhar" pelo grafo sem sair do dashboard.

---

## 4. Arquitetura de Agentes (Background)
O sistema trabalha enquanto você dorme (via Trigger.dev).

### 4.1. O "Bibliotecário" (Organizador Noturno)
- **Job:** Roda toda madrugada.
- **Ação:** Analisa o `Inbox`, sugere tags, move notas para pastas corretas e identifica tarefas órfãs.
- **Relatório:** Gera um "Briefing Matinal" no chat com o resumo da organização.

### 4.2. O "Estrategista" (Revisão Semanal)
- **Job:** Roda domingo à noite.
- **Ação:** Lê as notas da semana (`get_recent_changes`), resume os principais aprendizados e prepara o template da Nota Semanal.

---

## Resumo da Experiência Ideal
1.  **Você entra:** O Dashboard mostra seu **Foco do Dia** e o **Task Radar**.
2.  **Você trabalha:** Usa o **Chat** para perguntar "O que eu decidi sobre o projeto X?" (Memória) ou "Crie um rascunho para Y" (Ferramentas).
3.  **Você captura:** Tecla `Q` para anotar uma ideia rápida sem perder o fluxo.
4.  **Você revisa:** O sistema proativamente sugere conexões e organiza sua bagunça digital.