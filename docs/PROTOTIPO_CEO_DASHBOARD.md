# Protótipo – CEO Dashboard (Experiência estilo vectal.ai)

Este documento descreve o primeiro protótipo funcional para o novo CEO Dashboard,
mantendo a essência do “Segundo Cérebro” e tornando a experiência comparável ao
fluxo apresentado no vectal.ai (layout em três colunas, IA assistiva e captura
multimodal). O objetivo é orientar a construção de wireframes e do MVP visual.

---

## 1. Objetivos Centrais

1. **Captura Multimodal Unificada**
   - Texto livre (notas rápidas, comandos slash).
   - Áudio (gravação/transcrição → nota).
   - Imagens/documentos (upload → OCR/extração → resumo).

2. **Insights Assistidos por IA**
   - Perguntas ad-hoc respondidas com contexto do vault.
   - Resumos automáticos de notas recém-criadas.
   - Recomendações de links/relacionamentos entre notas.

3. **Agentes Autônomos**
   - Monitores programados (ex.: revisar notas pendentes, gerar tarefas).
   - Correlação automática (matching de tags, linkagem cruzada).
   - Gatilhos configuráveis por workspace/tenant.

4. **Camada Executiva Sem Acesso Direto ao FS**
   - Toda interação passa por OBC (REST/MCP).
   - Dashboard atua como “frontend inteligente” para o Segundo Cérebro.

---

## 2. Estrutura de Layout (4 Blocos Independentes)

```
┌────────────────┬───────────────────────────┬───────────────────────────┬──────────────┐
│ Bloco 1         │ Bloco 2                    │ Bloco 3                    │ Bloco 4       │
│ Sidebar         │ Timeline / Chat IA         │ Painel Operacional         │ Painel Utilit │
│ Navegação       │ Capture & Insights         │ Tarefas / Projetos / Inbox │ Agentes & KPIs│
└────────────────┴───────────────────────────┴───────────────────────────┴──────────────┘
```

Cada bloco pode ser redimensionado, expandido (full screen) ou colapsado individualmente. O divisor central entre Blocos 2 e 3 é móvel, habilitando visão maior de chat ou das tarefas conforme a necessidade. Atalhos do teclado (`Cmd/Ctrl + ←/→`) alternam foco entre os blocos.

### 2.1 Bloco 1 – Sidebar (Navegação Global)
- **Seletor de Workspace/Tenant** (dropdown + avatar).
- Grupos fixos: `Today`, `Inbox`, `Projects`, `Stats`, `Library`.
- Área “Favoritos” configurável (links para dashboards ou coleções de notas).
- Indicadores de sincronização / status do Brain Cloud.
- Botões rápidos inferiores:
  - `+ Nova Captura` (menu contextual para nota/tarefa/insight)
  - `🎙 Gravar Áudio`
  - `📷 Importar Imagem/PDF`
  - `⚙️ Configurações`

### 2.2 Bloco 2 – Timeline IA & Chat Cognitivo
- **Header contextual** destacando:
  - Visão atual (`Today`, `Weekly Review`, `Projeto X`…)
  - Meta diária ou foco semanal ativo (obtido via Brain Cloud).
  - Botões principais: `Novo Insight`, `Executar Agente Curador`, `Compartilhar`.
- **Composer unificado**:
  - Input com suporte a comandos (`/nota`, `/tarefa`, `/resumir`, `/agente`, `/whatsapp-import`).
  - Ações laterais para anexar mídia (áudio/imagens/documentos) e iniciar gravação.
  - Sugestões contextuais baseadas nos cards exibidos recentemente.
- **Cards da timeline**:
  - Mensagens estilo chat (humano ↔ IA).
  - Resumos do agente curador (diários/semanal).
  - Notas recém-criadas via inbox com quick actions.
  - Insights recomendados (com CTA de aceitar, editar ou descartar).
  - Logs de execução de agentes (status, duração, links para conteúdo gerado).
- Ações rápidas em cada card:
  - `Transformar em tarefa` (traz para Bloco 3).
  - `Fixar no painel 3` (insights críticos).
  - `Relacionar com projeto` / `Abrir no Obsidian`.
  - `Enviar ao WhatsApp` (quando pertinente).

### 2.3 Bloco 3 – Painel Operacional (Tarefas e Projetos)
- Abas principais (configuráveis):
  1. **Tarefas** – lista e Kanban, filtros por projeto/urgência, drag & drop.
  2. **Projetos** – resumo de projetos ativos com progresso e principais notas.
  3. **Inbox Curadoria** – notas brutas aguardando revisão pelo agente curador.
  4. **Insights Fixados** – itens priorizados pelo usuário ou IA.
- Quando um card da timeline é “fixado” ou convertido em tarefa, ele aparece aqui sem recarregar a página (state compartilhado).
- O cabeçalho da aba `Tarefas` destaca contadores: atrasadas, hoje, semana.
- Integração com Brain Cloud REST para listar e atualizar tarefas (`/tasks/*`).

### 2.4 Bloco 4 – Painel Utilitário (Launcher de Funções)
- **Botões rápidos** que disparam visualizações/contextos no Bloco 3:
  - `Tasks` → carrega lista/kanban atual no Painel Operacional.
  - `Daily Notes` → exibe notas de referência (hoje/ontem/semana).
  - `Workflows` → abre fluxo guiado (ex.: Weekly Review, Brainstorm).
  - `Search` → ativa busca avançada (REST + MCP) com resultados no Bloco 3.
- **Utilidades adicionais**:
  - `Agents` → abre painel avançado de agentes no Bloco 3 (lista completa + criar novo).
  - `MCP Tools` → catálogo rápido de ferramentas MCP com atalhos.
  - `Keyboard Shortcuts` → modal lateral com atalhos ativos.
- **Status compacto**:
  - Indicador de conectividade (REST/MCP) com tooltip de latência.
  - Badge para execuções recentes de agentes (abre log ao clicar, reutilizando o Bloco 3).

> O Bloco 4 funciona como um “dock” fixo: ele apenas aciona modos/abas do Bloco 3, mantendo o layout enxuto e evitando replicar informações. Agentes padrão continuam acessíveis via botão reservado (`Agents`) e aparecem em detalhe no Painel Operacional quando chamados.***

---

## 3. Fluxos Principais

### 3.1 Captura de Texto
1. Usuário abre composer (`/nota` ou botão `+`).
2. Define template (dropdown com `daily`, `project`, `insight`).
3. Envia; backend:
   - Chama `create_note_from_template` ou `write_file` via OBC.
   - Usa `append_content` ou `patch_content` para notas existentes.
4. Timeline adiciona card “Nota criada” + preview.

### 3.2 Captura de Áudio
1. Clicar em `🎙` → modal de gravação.
2. Após gravação, arquivo enviado → serviço de transcrição (ex.: Whisper).
3. Transcrição formatada como nota (template “Nota de Voz”).
4. Card na timeline mostra texto + link para áudio original.

### 3.3 Captura de Imagem/Documento
1. `📷 Importar` → upload (drag-drop).
2. Serviço chama `convert_to_markdown` (OBC) com OCR.
3. Resultado gera nota com highlights + imagem anexa (referência via assets).
4. IA gera resumo curto; usuário pode salvar ou descartar.

### 3.4 Perguntas/Insights
1. Usuário digita pergunta no composer.
2. Backend usa:
   - `semantic_search` para contexto.
   - Motor IA (Claude/ChatGPT) com prompt estruturado.
3. Resposta exibida com fontes (notas referenciadas).
4. CTA “Criar Insight” ou “Gerar Tarefa” dispara fluxos 3.5/3.6.

### 3.5 Criar Insight
1. Selecionar CTA.
2. Serviço monta markdown com metadados (tags, urgência, links).
3. Salva via `write_file` no diretório `5 - INSIGHTS-IA/Insights`.
4. Card na timeline com badges (urgência, confiança).

### 3.6 Criar Tarefa
1. CTA “Transformar em Tarefa” abre modal:
   - Título, prazo, prioridade, link para nota/insight origem.
2. Backend atualiza estrutura de tarefas (nota markdown ou storage JSON).
3. Painel direito atualiza sem recarregar (React Query).

### 3.7 Agentes Autônomos
1. Usuário agenda agente (ex.: “toda manhã às 7h gerar foco diário”).
2. Configuração salva via endpoint `POST /api/agents`.
3. Worker executa, chama OBC para dados, gera output.
4. Resultados entram na timeline como card “Agente executou”.

---

## 4. Componentes Chave (Frontend)

| Componente            | Descrição                                                    |
|-----------------------|--------------------------------------------------------------|
| `TenantSwitcher`      | Dropdown com avatar, nome do tenant e status de sync.        |
| `ContextSidebar`      | Lista navegável com ícones, badges e agrupadores.            |
| `TimelineComposer`    | Input principal (texto + ações multimodais).                 |
| `TimelineCard`        | Layout polimórfico (chat, nota, insight, agente).            |
| `TaskPanel`           | Tabs + listas de tarefas com quick actions.                  |
| `CalendarMini`        | Mini calendário destacado (próximos 7/30 dias).              |
| `InsightCard`         | Cards fixáveis com highlight de impacto.                     |
| `AgentStatusList`     | Status de agentes (ativo, aguardando, erro).                 |
| `MediaUploadModal`    | Fluxo de upload (áudio/imagem) com preview e processamento.  |
| `NoteTemplatePicker`  | Seleção de template + variáveis obrigatórias.                |

---

## 5. Integrações com OBC (REST/MCP)

| Necessidade                         | Ferramenta API/MCP                           |
|------------------------------------|----------------------------------------------|
| Listar diretórios/notas            | `list_files_in_vault`, `get_vault_tree`      |
| Ler conteúdo                       | `get_file_contents`, `batch_get_contents`    |
| Criar nota (template)              | `create_note_from_template`, `write_file`    |
| Acrescentar/alterar nota           | `patch_content`, `append_content`            |
| Converter mídia em texto           | `convert_to_markdown` (com OCR)              |
| Buscar contexto                    | `semantic_search`, `complex_search`          |
| Tarefas com datas                  | `get_due_tasks`, `get_tasks_summary`         |
| Foco diário                        | `get_current_focus`                          |
| Registros de conversa              | `save_conversation_history`                  |
| Sync/Status                        | `sync_vault`, `get_recent_changes`, `vaultStatus` |

---

## 6. Estados & Responsividade

- **Desktop**: layout 3 colunas. Painel direito pode colapsar (toggle).
- **Tablet**: sidebar colapsada; timeline ocupa largura total; painel direito vira drawer.
- **Mobile**: navegação via tabs na base (Today / Chat / Tasks / Agents). Composer flutuante.
- Tema escuro predominante (#121212) com acentos amarelo (#FFC857) e magenta (#FF2E63).

---

## 7. Próximos Artefatos

1. **Wireframes Figma (low-fi)**:
   - Telas: `Today`, `Projects > Detalhe`, `Agents`, `Mobile`.
   - Estados vazios (sem notas, sem tarefas).
   - Estados de carregamento (skeletons).

2. **Fluxogramas** (Miro ou Whimsical):
   - Captura de áudio → transcrição → nota → insight.
   - Pergunta → contexto → resposta → tarefa/nota.
   - Agente autônomo → execução agendada → timeline.

3. **Especificação Técnica**:
   - Componentização React (arquitetura de pastas).
   - Contratos de API (REST) que o backend precisará expor.
   - Estratégia de persistência para tarefas (Markdown vs. JSON).

---

## 8. Backlog Inicial (alto nível)

1. **Design**
   - Criar design system inicial (tipografia, cores, ícones).
   - Wireframes e protótipos navegáveis.
2. **Frontend**
   - Implementar layout base + roteamento.
   - Implementar sidebar e timeline com dados mock.
   - Integrar composer e cards básicos.
3. **Backend**
   - Endpoints agregadores (`/api/dashboard/today`, `/api/timeline`).
   - Serviço de upload (áudio/imagem) com fila para processamento.
   - Suporte a agentes (scheduler + armazenar logs).
4. **Infra**
   - Workers para transcrição/OCR.
   - Monitoramento das execuções de agentes.

---

## 9. Considerações

- O protótipo deve ser validado com usuários (executivos/consultores) para
  garantir que a informação crítica fica visível em menos de 3 interações.
- Manter coerência com terminologia do Segundo Cérebro (tags, pastas, workflows).
- Evitar ruído visual: cards focados em uma ação principal, botões adicionais
  agrupados em menus.
- Planejar extensões futuras (integração com email, calendários externos) já na
  arquitetura de componentes, mas não incluir no MVP.

---

**Próximo passo sugerido:** criar wireframes low-fi no Figma com base nesta descrição e coletar feedback antes de iniciar a implementação do layout no código.
