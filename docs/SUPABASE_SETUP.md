# Configuração com Supabase (PostgreSQL Gerenciado)

## 🎯 Visão Geral

O CEO Dashboard pode ser configurado para usar **Supabase** como banco de dados PostgreSQL gerenciado, eliminando a necessidade de instalar e manter um servidor PostgreSQL local.

## ✅ Vantagens do Supabase

- ✅ **Zero configuração** - Não precisa instalar PostgreSQL
- ✅ **Backup automático** - Dados protegidos
- ✅ **Escalável** - Cresce conforme sua necessidade
- ✅ **SSL nativo** - Conexões seguras
- ✅ **Free tier generoso** - 500MB de banco, 1GB de armazenamento
- ✅ **Dashboard visual** - SQL Editor, Table Editor

## 📋 Suas Credenciais Supabase

Você já tem um projeto Supabase configurado:

```
Host: aws-1-sa-east-1.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.dhhfcvpfijyuneikzrtd
Pool Mode: transaction
```

## 🔧 Configuração do `.env`

### 1. Copie o `.env.example` para `.env`

```bash
cp .env.example .env
```

### 2. Edite o arquivo `.env`

Substitua `[YOUR-PASSWORD]` pela sua senha do Supabase:

```env
# Database (PostgreSQL) - Supabase Configuration
DATABASE_URL=postgresql://postgres.dhhfcvpfijyuneikzrtd:[SUA-SENHA-AQUI]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres

# Ou use variáveis individuais (opcional)
DB_HOST=aws-1-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.dhhfcvpfijyuneikzrtd
DB_PASSWORD=[SUA-SENHA-AQUI]
DB_SSL=true
```

**💡 Dica**: Use `DATABASE_URL` - é mais simples e seguro.

### 3. Onde encontrar a senha no Supabase?

1. Acesse https://supabase.com/dashboard/project/[seu-projeto]
2. Vá em **Settings** → **Database**
3. Em **Connection string**, clique em **URI**
4. Copie a senha (ou resete se esqueceu)

## 🚀 Executar Setup

Depois de configurar o `.env`, execute:

```bash
# 1. Instalar dependências (se ainda não instalou)
npm install

# 2. Executar migrations e seed data
npm run db:setup
```

### O que o script faz no Supabase:

1. ✅ Detecta `DATABASE_URL` (pula criação de banco)
2. ✅ Executa 13 migrations (cria tabelas)
3. ✅ Popula seed data (tenant + usuário dev)
4. ✅ Testa conexão

### Output esperado:

```
🚀 CEO Dashboard - Database Setup

⚠️  Usando DATABASE_URL (Supabase) - pulando criação de banco
   Supabase já tem o banco 'postgres' configurado

🔄 Executando migrations...
✅ Migrations executadas com sucesso

🔌 Testando conexão...
✅ Conexão estabelecida: 2025-01-15 10:30:00

📋 Tabelas criadas:
   - agents
   - agent_runs
   - brain_configs
   - conversations
   - decisions
   - messages
   - oauth_providers
   - pgmigrations
   - projects
   - tasks
   - tenants
   - user_settings
   - users
   - workflows

✨ Setup concluído com sucesso!

Credenciais de desenvolvimento:
  Email: dev@ggai.dev
  Senha: Dev@2025!
```

## 🔍 Verificar Tabelas no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **Table Editor**
3. Você verá 13 tabelas criadas:
   - `tenants`
   - `users`
   - `brain_configs`
   - `projects`
   - `tasks`
   - `conversations`
   - `messages`
   - `decisions`
   - `agents`
   - `agent_runs`
   - `workflows`
   - `user_settings`
   - `oauth_providers`

## 🧪 Testar Conexão

```bash
# Testar a stack completa
npm run test:stack
```

Ou teste manualmente:

```bash
# Iniciar servidor
npm run dev:backend

# Em outro terminal, testar health check
curl http://localhost:3001/api/health/db
```

## 📊 Visualizar Dados no Supabase

### Via SQL Editor:

1. **SQL Editor** no Supabase
2. Execute queries:

```sql
-- Ver tenants
SELECT * FROM tenants;

-- Ver usuários
SELECT u.email, u.name, t.name as tenant_name
FROM users u
JOIN tenants t ON u.tenant_id = t.id;

-- Ver projetos
SELECT * FROM projects;
```

### Via Table Editor:

1. **Table Editor** no Supabase
2. Clique em qualquer tabela
3. Visualize e edite dados diretamente

## 🔒 Segurança

### Connection Pooling

Supabase usa **Supavisor** (connection pooler) na porta `6543`:

- ✅ **Transaction mode** - Melhor performance
- ✅ **Gerencia conexões automaticamente**
- ✅ **Suporta até 10 conexões simultâneas (free tier)**

### SSL

Todas as conexões usam SSL automaticamente:

```javascript
ssl: { rejectUnauthorized: false }
```

### Row-Level Security (RLS)

Todas as tabelas têm RLS habilitado:

```sql
-- Exemplo: users só veem dados do seu tenant
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

## 🐛 Troubleshooting

### Erro: "password authentication failed"

**Problema**: Senha incorreta no `.env`

**Solução**:
1. Verifique a senha no Supabase Dashboard
2. Copie exatamente como está (sem espaços)
3. Ou resete a senha em **Settings** → **Database**

### Erro: "connection timeout"

**Problema**: Firewall ou conexão lenta

**Solução**:
1. Verifique sua conexão com a internet
2. O timeout foi aumentado para 10s (suficiente)
3. Tente novamente em alguns segundos

### Erro: "too many connections"

**Problema**: Limite de conexões do free tier (10)

**Solução**:
1. Reduza `DB_POOL_MAX` no `.env`:
   ```env
   DB_POOL_MAX=5
   ```
2. Ou upgrade para plano pago

### Erro: "relation does not exist"

**Problema**: Migrations não foram executadas

**Solução**:
```bash
npm run db:setup
```

## 💰 Limites do Free Tier

| Recurso | Limite Free | Limite Pro |
|---------|-------------|------------|
| Database | 500 MB | 8 GB |
| Storage | 1 GB | 100 GB |
| Bandwidth | 2 GB | 50 GB |
| Connections | 10 simultâneas | 200+ |
| Backups | 7 dias | 30 dias |

**💡 Dica**: Para desenvolvimento, o free tier é mais que suficiente!

## 🔄 Migrações

### Criar nova migration:

```bash
npm run migrate:create nome-da-migration
```

### Executar migrations:

```bash
npm run migrate:up
```

### Reverter última migration:

```bash
npm run migrate:down
```

## 🌐 Produção

Para produção no Supabase:

1. **Crie projeto de produção** no Supabase
2. **Configure variáveis de ambiente**:
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres
   ```
3. **Execute migrations**:
   ```bash
   npm run migrate:up
   ```
4. **Configure backup automático** (Supabase faz automaticamente)

## 📚 Recursos

- [Supabase Database](https://supabase.com/docs/guides/database)
- [Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## ✅ Checklist

- [ ] Criar conta no Supabase (se não tiver)
- [ ] Copiar connection string
- [ ] Configurar `.env` com `DATABASE_URL`
- [ ] Executar `npm run db:setup`
- [ ] Verificar tabelas no Supabase Dashboard
- [ ] Testar com `npm run test:stack`
- [ ] Iniciar servidor com `npm run dev`

---

**Pronto!** Seu CEO Dashboard está conectado ao Supabase 🎉
