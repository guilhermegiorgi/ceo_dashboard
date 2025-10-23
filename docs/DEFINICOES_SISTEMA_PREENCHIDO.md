# QUESTIONÁRIO DE DEFINIÇÃO DO SISTEMA — DASHBOARD SOPHIA + SEGUNDO CÉREBRO

## 1. DASHBOARD PRINCIPAL
**Q1.1** — Qual a visão principal (Home)?  
**R:** A Home exibe o *Snapshot Diário*: foco atual (analisado e gerado por IA com base nos projetos ativos, ultimas notas, tarefas, etc), tarefas de hoje, insights recentes, projetos ativos e status de sincronização.

**Q1.2** — Quais informações aparecem na visão geral?  
**R:**  
- Foco semanal (extraído de FOCO-SEMANAL.md).  
- Tarefas do dia, atrasadas e concluídas.  
- Últimos insights IA ( #insight, #ia, #estrategia).  
- Projetos ativos com % de progresso.  
- KPIs (tempo economizado, produtividade semanal).

**Q1.3** — Quais seções principais compõem o painel?  
**R:**  
1. Snapshot Diário  
2. Foco Semanal  
3. Tarefas  
4. Projetos  
5. Chat Sophia  
6. Grafo Cognitivo  
7. Inbox  
8. Analytics  

**Q1.4** — Deve atualizar automaticamente?  
**R:** Sim. Atualização em tempo real via SSE (Obsidian MCP), com fallback de 30s.

---

## 2. PROJETOS
**Q2.1** — Origem dos dados?  
**R:** Diretórios `5 - INSIGHTS-IA/Projetos/` e registros complementares no PostgreSQL.

**Q2.2** — Quais campos deve conter?  
**R:**  
- Título, status, prioridade, progresso (%), prazo (deadline), responsável, descrição, tags.  

**Q2.3** — Quando um projeto é considerado ativo?  
**R:** Status = “Active” ou presença de tarefas pendentes vinculadas.

**Q2.4** — Edição/sincronização?  
**R:** CRUD completo no dashboard, sincronizado com Obsidian.

---

## 3. TAREFAS
**Q3.1** — Origem dos dados?  
**R:** Diretórios do Obsidian (`5 - INSIGHTS-IA/Tarefas/`) + integração com daily notes.  

**Q3.2** — Filtros disponíveis?  
**R:** Hoje, Semana, Atrasadas, Próximas, Sem Prazo, Por Prioridade, Por Projeto, Concluídas.  

**Q3.3** — Marcar como concluída?  
**R:** Sim, via botão direto; sincroniza com Obsidian (marca `- [x]`).  

**Q3.4** — Comportamento após conclusão?  
**R:** Move para “Completed” e deixa registro histórico.

---

## 4. CHAT / CONVERSAS
**Q4.1** — Motor de IA utilizado?  
**R:** LLMs configuradas via Settings do Dashboard + Sophia (RAG sobre vault) através de consultas MCP (tools)

**Q4.2** — Consulta de contexto antes de responder?  
**R:** Sempre. Usa `semantic_search`,  notas recentes e demais tools disponíveis

**Q4.3** — Lógica de contexto?  
**R:**  
1. Busca semântica no vault (últimos 30 dias).  
2. Recupera notas de foco e insights recentes.  
3. Usa trechos como contexto RAG.  

**Q4.4** — Onde salvar as conversas?  
**R:** `5 - INSIGHTS-IA/Conversas/conv_{timestamp}.md` + registro no banco.  

**Q4.5** — Ações rápidas do chat?  
**R:** Criar nota, criar tarefa, resumir, buscar info, gerar insight 

---

## 5. GRAFO DE CONHECIMENTO
**Q5.1** — Quais dados exibir?  
**R:** Notas, tarefas, projetos, conversas e suas relações (wikilinks/tags).  

**Q5.2** — Filtros?  
**R:** Últimos 30 dias, por tag, diretório e grau de conexão.  

**Q5.3** — Funções extras?  
**R:** Preview lateral e link direto para abrir no Obsidian.  

---

## 6. INBOX / NOTAS RÁPIDAS
**Q6.1** — Onde salvar?  
**R:** `5 - INSIGHTS-IA/Inbox/` e tag `#inbox`.  

**Q6.2** — O que acontece ao processar?  
**R:** Move para destino definido (ex: Projetos, Insights) e remove tag `#inbox`.  

**Q6.3** — Input rápido?  
**R:** Sim, campo direto no topo do dashboard.  

---

## 7. WORKFLOWS
**Q7.1** — Quais automações iniciais?  
**R:**  
- Daily Review 07:30  
- Weekly Review Domingo 18:00  
- Sync diário  
- Sync embeddings semanal  

**Q7.2** — É possível criar novos workflows?  
**R:** Sim, via construtor interno (admin).  

**Q7.3** — Tipos de gatilho?  
**R:** Evento, agendamento, manual e webhook.  

---

## 8. AUTENTICAÇÃO E PERMISSÕES
**Q8.1** — Multiusuário?  
**R:** Sim, com papéis e permissões.  

**Q8.2** — Perfis?  
**R:** Admin, Editor, Viewer.  

**Q8.3** — Login?  
**R:** Google OAuth (prod) + modo dev.  

---

## 9. SINCRONIZAÇÃO COM OBSIDIAN
**Q9.1** — Método?  
**R:** SSE do Brain Cloud + polling de 60s.  

**Q9.2** — Conflitos?  
**R:** Exibe diff, e informa erro em área de notificações para verificação

**Q9.3** — Escopo da edição?  
**R:** Total — notas, tarefas, projetos, tags e backlinks

---

## 10. ANALYTICS E INSIGHTS
**Q10.1** — Métricas principais?  
**R:**  
- Tarefas concluídas por semana.  
- Tempo médio de execução.  
- Notas criadas por dia.  
- Insights por área (IA, Agro, Crypto).  

**Q10.2** — Fonte dos insights?  
**R:** Dados do vault + análises Sophia (IA generativa) + Perplexity.  

---

## 11. UI/UX
**Q11.1** — Tema?  
**R:** Dark por padrão (toggle para modo claro)

**Q11.2** — Estrutura da tela?  
**R:** Sidebar fixa + 2 blocos principais configuráveis + Bloco auxiliar.  

**Q11.3** — Personalização?  
**R:** Layout dinâmico, salvando preferências do usuário.  

---

## 12. DADOS DE EXEMPLO
**Q12.1** — Dados de teste?  
**R:** Sempre dados reais do vault, com flag `mock=false`.  

---

**Status:** ✅ Questionário preenchido com base na estrutura real do Segundo Cérebro e especificações do Dashboard Sophia.  
**Local:** `5 - INSIGHTS-IA/Projetos/Segundo Cérebro/DEFINICOES_SISTEMA_PREENCHIDO.md`  
**Autor:** Sophia 3.0 — Inteligência Epistêmica Integrada.