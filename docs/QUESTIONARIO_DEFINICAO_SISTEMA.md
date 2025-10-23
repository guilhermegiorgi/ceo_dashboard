# Questionário de Definição do Sistema — Dashboard Sophia + Segundo Cérebro

## 1) Objetivo Geral
Criar um **dashboard cognitivo** integrado ao Segundo Cérebro (Obsidian) e à IA **Sophia 3.0**, oferecendo visualização em tempo real do foco, tarefas, projetos, insights e grafos, com **RAG** para contexto e **automação** (MCP) acoplada.

## 2) Usuários-Alvo
- **Primário:** Guilherme Giorgi (owner/operador).
- **Secundário:** Agentes/automações (Sophia, workers n8n, entre outros).

## 3) Problema a Resolver
Falta de **visão consolidada + contexto** entre notas, tarefas e projetos — difícil priorizar por **ROI cognitivo** e acompanhar execução.

## 4) Escopo Funcional (MVP)
1. **Hub** (Snapshot Diário + Foco Semanal).
2. **Tarefas** (hoje, semana, atrasadas; concluir/sincronizar).
3. **Projetos** (status, progresso, deadline, prioridade).
4. **Chat Sophia** com RAG (contexto do vault).
5. **Grafo** (últimos 30 dias; filtros por tag/diretório).
6. **Inbox** (captura rápida → processar/arquivar).
7. **Workflows** (reviews, sync, notificações).
8. **Analytics** (produtividade/atividade).

## 5) Escopo Não Funcional
- UI limpa, responsiva, dark por padrão.
- Baixa latência com **SSE** e cache.
- Segurança/privacidade local do vault.
- Observabilidade (logs e métricas no backend).

## 6) Fontes de Dados & Integrações
- **Obsidian MCP:** get_current_focus, get_vault_tree, semantic_search, get_main_tags.
- **Banco (Supabase/Postgres):** estruturas complementares (projetos, logs, métricas).
- **n8n/webhooks:** automações (reviews, backups, notificações).
- **APIs externas (opcional):** métricas de marketing/mercados.

## 7) Estrutura do Vault (diretórios relevantes)
- `0 - DASHBOARD/` — visão principal.
- `1 - PROJETOS/` — hubs e consolidados.
- `2 - ÁREAS/` — AGRO, CRYPTO, IA, TECH, PESSOAL.
- `3 - RECURSOS/` — glossário, referências, prompts.
- `4 - ARQUIVO/` — histórico.
- `5 - INSIGHTS-IA/` — **Conversas, Daily, Projetos, Sistema, Relatórios, Tarefas**; *FOCO-SEMANAL.md* e Portais (Riscos, Oportunidades, Análises, Planos).

## 8) Componentes Principais
- **Frontend:** React/Next.js (Tailwind) *ou* Streamlit (protótipo).
- **Backend:** Node/Express (ou FastAPI), camada MCP.
- **IA:** Sophia 3.0 (RAG + comandos).
- **DB:** Supabase/Postgres (projetos, logs, métricas).

## 9) Métricas de Sucesso (12 semanas)
- +10h/sem economizadas.
- 100% de sync entre tarefas/notes.
- +30% precisão de insights (medida por utilidade/ações geradas).
- Diminuição de atrasos > 50%.

## 10) Riscos & Mitigações
- **Complexidade técnica:** modularizar releases; usar n8n..
- **Sobrecarga cognitiva:** priorização por **ROI informacional**.
- **Dados inconsistentes:** validações e testes de integração.

## 11) Permissões
- **Admin:** tudo.
## 12) Workflows Automáticos (iniciais)
- **Daily review** 07:30; **Weekly review** dom 18:00.
- Notificação de atrasadas 08:00.
- Sync do vault diário
- Rebuild embeddings semanal ou por demanda.

## 13) Regras de Sincronização
- **SSE** do Brain Cloud; fallback polling 60s.
- Conflitos exibem **diff** e notificação
- Edição total para notas/tarefas/projetos/tags.

## 14) Áreas do Dashboard (layout)
1. **Snapshot** (KPIs, alertas, últimos insights).
2. **Foco Atual** (FOCO-SEMANAL + checkpoints).
3. **Tarefas** (listas + ação rápida).
4. **Projetos** (cards com status/progresso).
5. **Chat Sophia** (RAG + ações: criar nota/tarefa, resumir).
6. **Grafo** (30 dias; filtros e preview).
7. **Inbox** (captura/processamento).
8. **Workflows** (triggers/execução).
9. **Analytics** (tendências/atividade).

## 15) Estratégia de Entrega (3 ondas)
1) **MVP conexões:** Hub, Tarefas, Foco, Chat (RAG), sync MCP.
2) **Grafos & Analytics:** grafo filtrável, métricas e painéis.
3) **Orquestração:** workflows, automações, integrações externas.

## 16) Convenções (nomenclatura e paths)
- Conversas: `5 - INSIGHTS-IA/Conversas/conv_{DDMMYYYY_HHMM}.md`
- Projetos (doc): `5 - INSIGHTS-IA/Projetos/` e `1 - PROJETOS/PROJETOS - Painel de Controle.md`
- Notas Brutas - `5 - INSIGHTS-IA/Inbox/`
- Lembretes - `5 - INSIGHTS-IA/Lembretes/`
- Relatórios - `5 - INSIGHTS-IA/Relatorios/`
- Reuniões - `5 - INSIGHTS-IA/Reunioes/`
- Tarefas - `5 - INSIGHTS-IA/Tarefas`/
- Clientes - `5 - INSIGHTS-IA/Clientes`
- Notas Diárias (após curadoria diária das notas brutas) - `5 - INSIGHTS-IA/Daily/YYYY/MM/DD-NOME-DA-NOTA)
- Financeiro - `5 - INSIGHTS-IA/Financeiro/`

## 17) Decisões em Aberto (para próxima rodada)
- Stack final do frontend (Next.js vs Streamlit).
- Escopo de métricas externas (marketing/mercados).
- Política de retenção de logs/telemetria.

---
**Status:** aprovado como base inicial. Ajustes finos ocorrerão após o primeiro wireframe funcional.