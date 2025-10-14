# Database Setup Guide

## Visão Geral

O CEO Dashboard utiliza **PostgreSQL** como banco de dados principal com arquitetura **multi-tenant** e **Row-Level Security (RLS)** para isolamento de dados.

## Pré-requisitos

- PostgreSQL 14+ instalado e rodando
- Node.js 16+ instalado
- npm ou yarn

## Instalação do PostgreSQL

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS (Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

### Windows
Download do instalador oficial: https://www.postgresql.org/download/windows/

## Configuração Inicial

### 1. Criar usuário do PostgreSQL (opcional)

```bash
sudo -u postgres psql
```

```sql
CREATE USER ceo_dashboard WITH PASSWORD 'sua_senha_aqui';
ALTER USER ceo_dashboard CREATEDB;
\q
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure as credenciais do PostgreSQL:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ceo_dashboard_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ceo_dashboard_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

### 3. Executar setup automático

O setup automático irá:
- Criar o banco de dados
- Executar todas as migrations
- Popular com dados de desenvolvimento
- Testar a conexão

```bash
npm run db:setup
```

## Migrations

### Estrutura das Migrations

As migrations estão organizadas no diretório `/migrations`:

1. **1710000000000_create-tenants-table.js** - Tabela de tenants (organizações)
2. **1710000000001_create-users-table.js** - Tabela de usuários
3. **1710000000002_create-brain-configs-table.js** - Configurações do Brain Cloud
4. **1710000000003_create-conversations-table.js** - Conversas
5. **1710000000004_create-messages-table.js** - Mensagens
6. **1710000000005_create-decisions-table.js** - Decisões estratégicas
7. **1710000000006_create-agents-table.js** - Agentes de IA
8. **1710000000007_create-agent-runs-table.js** - Execuções de agentes
9. **1710000000008_create-projects-table.js** - Projetos
10. **1710000000009_create-tasks-table.js** - Tarefas
11. **1710000000010_create-workflows-table.js** - Workflows
12. **1710000000011_create-user-settings-table.js** - Configurações de usuário
13. **1710000000012_seed-development-data.js** - Dados de desenvolvimento

### Comandos de Migration

```bash
# Executar todas as migrations pendentes
npm run migrate:up

# Reverter última migration
npm run migrate:down

# Criar nova migration
npm run migrate:create nome-da-migration
```

## Schema do Banco de Dados

### Tabelas Core

#### tenants
Organizações/empresas usando a plataforma.
- Isolamento multi-tenant com RLS
- Suporta diferentes planos (free, pro, enterprise)

#### users
Usuários pertencentes a um tenant.
- Email único por tenant
- Roles: admin, member, viewer
- Password hash com bcrypt

#### brain_configs
Configurações do Obsidian Brain Cloud por usuário.
- Vault path e MCP server URL
- API key criptografada
- Settings personalizadas

### Tabelas de Funcionalidades

#### projects
Projetos para organização de trabalho.
- System prompts personalizados
- Filtros de contexto do Brain (directories, tags)
- Auto task generation

#### tasks
Tarefas com sincronização Obsidian.
- Status: pending, in_progress, completed, cancelled
- Priority levels
- Subtasks/checklists em JSONB
- Bidirectional sync com Obsidian

#### conversations & messages
Conversas de chat com contexto do Brain Cloud.
- Armazena contexto recuperado do Brain
- Token counting
- Metadata flexível

#### decisions
Decisões estratégicas documentadas.
- Context, rationale, alternatives
- Impact levels (high, medium, low)
- Review dates e outcomes

#### agents & agent_runs
Agentes de IA configuráveis.
- Diferentes tipos de agente
- Histórico de execuções
- Input/output em JSONB

#### workflows
Automações com triggers e actions.
- Event-driven, scheduled, manual, webhook
- Conditions e actions em JSONB
- Run tracking

## Row-Level Security (RLS)

Todas as tabelas possuem políticas RLS para isolamento de dados:

```sql
-- Exemplo: Policy para isolation de tenant
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Como funciona

O middleware de autenticação define o contexto do tenant/user:

```javascript
// No código da aplicação
await db.query(
  'SELECT * FROM conversations',
  [],
  {
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002'
  }
);
```

Isso é convertido para:

```sql
SET LOCAL app.current_tenant_id = '00000000-0000-0000-0000-000000000001';
SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000002';
SELECT * FROM conversations; -- RLS filtra automaticamente
```

## Dados de Desenvolvimento

### Credenciais Seed

Após executar `npm run db:setup`, você terá:

**Tenant:**
- Nome: GG.AI Labs
- Slug: ggai-labs
- Plan: enterprise

**Usuário:**
- Email: `dev@ggai.dev`
- Senha: `Dev@2025!`
- Role: admin

**Projeto de exemplo:**
- Nome: "CEO Dashboard Development"
- Com tasks, conversations e mensagens de exemplo

### Resetar dados

```bash
# Reverter todas as migrations (CUIDADO!)
npm run migrate:down

# Re-executar setup completo
npm run db:setup
```

## Backup e Restore

### Criar backup

```bash
pg_dump -U postgres -d ceo_dashboard_dev > backup.sql
```

### Restaurar backup

```bash
psql -U postgres -d ceo_dashboard_dev < backup.sql
```

## Troubleshooting

### Erro: "PostgreSQL não está rodando"

```bash
# Ubuntu/Debian
sudo systemctl status postgresql
sudo systemctl start postgresql

# macOS
brew services list
brew services start postgresql@14
```

### Erro: "database does not exist"

Execute o setup automático:
```bash
npm run db:setup
```

### Erro: "permission denied"

Verifique as permissões do usuário PostgreSQL:
```sql
GRANT ALL PRIVILEGES ON DATABASE ceo_dashboard_dev TO postgres;
```

### Ver logs do PostgreSQL

```bash
# Ubuntu/Debian
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# macOS (Homebrew)
tail -f /usr/local/var/log/postgresql@14.log
```

## Próximos Passos

Após configurar o banco de dados:

1. ✅ Database configurado
2. 📝 Implementar autenticação JWT ([MULTI_TENANT_ARCHITECTURE.md](MULTI_TENANT_ARCHITECTURE.md))
3. 🔌 Conectar com Obsidian Brain Cloud via MCP ([INTEGRATION_PLAN.md](INTEGRATION_PLAN.md))
4. 🎨 Criar interfaces para Projects e Tasks
5. 🤖 Implementar workflows e automações

## Referências

- [MULTI_TENANT_ARCHITECTURE.md](MULTI_TENANT_ARCHITECTURE.md) - Arquitetura completa
- [INTEGRATION_PLAN.md](INTEGRATION_PLAN.md) - Plano de integração com Brain Cloud
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [node-pg-migrate Documentation](https://github.com/salsita/node-pg-migrate)
