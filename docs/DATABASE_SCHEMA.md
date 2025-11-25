# Schema do Banco de Dados Completo (Definitivo)

Este documento consolida **todas** as tabelas encontradas nas migrações (`.cjs` e `.sql`), revelando uma estrutura muito mais madura do que a análise inicial sugeria.

**Fontes:**
- `migrations/*.cjs` (Schema Base: Projects, Tasks, Agents, Workflows)
- `migrations/*.sql` (Extensões: Chat Context, AI Providers)
- `server/database/migrations/001_auth_schema.sql` (Auth Core)

---

## 1. Núcleo & Autenticação

### `tenants` & `users` & `oauth_providers`
Estrutura padrão multi-tenant e auth híbrida (já documentada).

### `user_settings`
- **theme**, **language**: Preferências de UI.

---

## 2. Segundo Cérebro & Projetos (O "Vectal" Core)

### `brain_configs` (Conexão Obsidian)
Configuração de conexão com o cofre por usuário.
- **vault_path**: Caminho local/remoto.
- **mcp_server_url**: Endpoint do servidor MCP.
- **mcp_api_key_encrypted**: Chave para o Brain Cloud.

### `projects` (Projetos)
A unidade organizadora do trabalho.
- **brain_context_enabled**: Boolean. Se true, o projeto "vê" o Obsidian.
- **brain_directories**, **brain_tags**: Filtros de contexto (ex: Só notas da pasta "Marketing").
- **system_prompt**: Prompt customizado para agentes neste projeto.

### `decisions` (Diário de Decisões)
Rastreamento de decisões estratégicas (Feature avançada já existente!).
- **context**, **decision**, **rationale**: O "porquê" da decisão.
- **obsidian_note_path**: Link para a nota original.
- **impact**, **status**: Metadados de gestão.

---

## 3. Gestão de Tarefas & Workflows

### `tasks` (Cache Inteligente)
Esta tabela **JÁ EXISTE** e suporta sync.
- **obsidian_sync_enabled**: Se true, reflete no Markdown.
- **obsidian_note_path**: Onde a tarefa vive no cofre.
- **ai_generated**: Flag para saber se foi sugestão da IA.
- **priority**, **due_date**, **status**: Campos padrão de gestão.

### `workflows` (Automação)
Estrutura para o Trigger.dev ou automações internas.
- **trigger_type**: 'event', 'schedule', 'webhook'.
- **actions**: JSON definindo o pipeline.
- **last_run_status**: Logs de execução.

---

## 4. Agentes & IA

### `agents` (Configuração de Personas)
- **agent_type**: 'research', 'code-review', etc.
- **system_prompt**: A "alma" do agente.
- **brain_context_settings**: Como este agente acessa o cérebro.

### `ai_providers` & `ai_models`
Infraestrutura BYOK (Bring Your Own Key) para LLMs (já documentada).

### `conversations` & `messages`
Chat com contexto de projeto/nota (já documentada).

---

## Conclusão da Análise

O banco de dados está **95% pronto** para a visão "Vectal + Segundo Cérebro".

**O que temos pronto:**
1.  **Sync de Tarefas:** A tabela `tasks` já foi desenhada para espelhar o Obsidian.
2.  **Contexto de Projeto:** A tabela `projects` já tem filtros de diretórios/tags do Obsidian.
3.  **Memória de Decisão:** A tabela `decisions` é exatamente o que o usuário pediu em "Advanced Features".

**O que realmente falta (Ajustes Finos):**
1.  **Embeddings:** Confirmado que será via API, então **não precisamos criar tabela**.
2.  **Integração Trigger.dev:** A tabela `workflows` existe, mas precisaremos conectá-la ao SDK do Trigger.dev v3.

**Veredito:** Podemos focar quase inteiramente no **Frontend (Dashboard)** e na **Integração MCP**, pois o Backend/DB já está extremamente robusto.
