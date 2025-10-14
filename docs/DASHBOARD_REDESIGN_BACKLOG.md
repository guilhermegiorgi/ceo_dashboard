# Dashboard Redesign — Backlog Incremental

Este backlog organiza a evolução do CEO Dashboard em etapas curtas, sempre garantindo que o sistema continue utilizável enquanto novas integrações são adicionadas. Cada fase gera entregáveis tangíveis e facilita revisões rápidas.

---

## Fase 0 — Preparação Técnica
1. **Normalizar Configurações**
   - Garantir carregamento de variáveis (.env) tanto no backend antigo quanto na nova stack (`server/index.js` vs `server/src/*`).
   - Finalizar migração do serviço de agentes para PostgreSQL (já iniciado) e remover dependências legadas de SQLite.
2. **Diagnóstico Brain Cloud**
   - Validar conectividade REST/MCP com ambiente produtivo (gerar token, verificar `/api/v1/health`).
   - Definir fallback quando a API estiver indisponível (mensagens amigáveis + retry exponencial).
3. **Definir Catálogo de Agentes Padrão**
   - Documentar prompts, ferramentas e periodicidade de: Curador Diário, Radar de Projetos, Analista de Riscos.
   - Criar seeds opcionais para novos tenants.

## Fase 1 — Fundamentos do Layout (4 Blocos)
1. **Infra de Layout**
   - Implementar contêiner principal com grid flexível (Bloco 1–4).
   - Habilitar redimensionamento dos painéis 2↔3 via drag handle (ex.: `react-resizable-panels`).
   - Adicionar controles de colapso/expansão (atalhos de teclado).
2. **Bloco 1 (Sidebar)**
   - Reorganizar navegação, aplicar agrupamentos e badges de status.
   - Conectar botões rápidos a fluxos existentes (nova nota, gravação, upload).
3. **Bloco 4 (Painel Utilitário/Launcher)**
   - Implementar dock com botões `Tasks`, `Daily Notes`, `Workflows`, `Search`, `Agents`, `MCP Tools`, `Keyboard Shortcuts`.
   - Cada ação deve alterar o estado do Bloco 3 (abas/mode) em vez de renderizar conteúdo no próprio bloco utilitário.
   - Garantir feedback visual (selecionado/ativo) e indicador compacto de status REST/MCP.

## Fase 2 — Timeline IA & Inbox
1. **Composer Unificado**
   - Suportar comandos (`/nota`, `/tarefa`, `/agente`, `/whatsapp-import`).
   - Exibir quick actions laterais (áudio/imagem/documento).
2. **Cards Inteligentes**
   - Normalizar componentes de card para chat, nota, insight e execução de agente.
   - Associar ações contextuais (fixar, converter em tarefa, abrir no Obsidian).
3. **Agente Curador**
   - Implementar execução manual: chama Brain Cloud, sintetiza Inbox → cria insight diário.
   - Entregar card com resumo e links.

## Fase 3 — Painel Operacional (Tarefas/Projetos)
1. **Integração REST**
   - Conectar `getDueTasks`, `getTasksSummary`, `getOverdueTasks` ao painel (Bloco 3).
   - Tratar indisponibilidade (mensagens no UI).
2. **Kanban & Lista**
   - Disponibilizar duas views (list/kanban) com filtros.
   - Permitir drag & drop entre colunas (update via API).
3. **Inbox Curadoria**
   - Listar notas brutas derivadas do WhatsApp/dashboard.
   - Ações: abrir, editar, arquivar, enviar para agente.

## Fase 4 — Convergência com WhatsApp e Automação
1. **Sync WhatsApp → Inbox**
   - Conectar pipeline que cria notas brutas na pasta `Inbox`.
   - Identificar metadados (autor, canal, timestamp).
2. **Automação de Agentes**
   - Agendamentos configuráveis (cron) com feedback visual no Bloco 4.
   - Logs acessíveis (últimas execuções + status detalhado).
3. **Insights Fixados & KPIs**
   - Persistir insights fixados pelo usuário (flag no arquivo ou DB).
   - Mostrar KPIs do dia/semana (tarefas concluídas, insights aceitos, novas notas).

## Fase 5 — Refinos & Observabilidade
1. **Modo Foco**
   - Permitir ocultar blocos 1 e 4 para sessões de trabalho intensivo.
   - Salvar preferências por usuário.
2. **Telemetria**
   - Definir métricas-chave (tempo médio para gerar insight, execuções de agentes).
   - Integrar com Sentry/Log aggregator para monitorar falhas de integrações.
3. **Documentação Viva**
   - Atualizar README e docs de integração a cada release incremental.
   - Manter changelog claro (scripts `docs/INTEGRACAO_*`).

---

### Próximo Marco Sugerido
Começar pela **Fase 1**, entregando:
- Grid base com quatro blocos redimensionáveis.
- Sidebar reorganizada.
- Painel utilitário com catálogo de agentes padrão (mesmo que dados mockados).

Uma vez concluída, avançar para a timeline unificada (Fase 2), que é o coração da experiência diária. Cada fase pode ser fatiada em PRs menores (ex.: 1.1 Grid, 1.2 Sidebar, 1.3 Painel utilitário) para facilitar revisão contínua.***
