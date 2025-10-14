# Arquitetura Multi-Tenant - CEO Dashboard + Brain Cloud

## 🎯 Visão Geral

Sistema **multi-tenant** profissional para gerenciamento de Segundo Cérebro com:
- Isolamento completo por tenant (organização)
- Configurações individuais de Brain Cloud por usuário
- Persistência em PostgreSQL
- Autenticação JWT com refresh tokens
- Row-Level Security (RLS)

---

## 📊 Modelo de Dados

### 1. **Tenants** (Organizações)
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  status VARCHAR(50) DEFAULT 'active',
  brain_cloud_enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **Users** (Usuários)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'member', -- admin, member, viewer
  status VARCHAR(50) DEFAULT 'active',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
```

### 3. **Brain Configs** (Configurações do Segundo Cérebro)
```sql
CREATE TABLE brain_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Conexão com Obsidian
  vault_path TEXT NOT NULL,
  vault_name VARCHAR(255),
  mcp_server_url TEXT,
  mcp_api_key_encrypted TEXT,

  -- Configurações
  default_note_folder VARCHAR(255) DEFAULT 'INBOX',
  note_templates JSONB DEFAULT '{}',
  sync_enabled BOOLEAN DEFAULT true,
  auto_sync_interval INTEGER DEFAULT 300, -- segundos

  -- Estado
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'idle', -- idle, syncing, error
  sync_error TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_brain_configs_tenant ON brain_configs(tenant_id);
CREATE INDEX idx_brain_configs_user ON brain_configs(user_id);
```

### 4. **Conversations** (Conversas do Chat)
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  summary TEXT,
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX idx_conversations_status ON conversations(status);
```

### 5. **Messages** (Mensagens)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  role VARCHAR(50) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,

  -- Contexto usado
  context_notes JSONB DEFAULT '[]', -- [{path, title, excerpt, relevance}]
  context_enabled BOOLEAN DEFAULT true,

  -- Metadados
  model VARCHAR(100),
  temperature REAL,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

### 6. **User Settings** (Configurações de Usuário)
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Chat Settings
  chat_brain_context_enabled BOOLEAN DEFAULT true,
  chat_note_limit INTEGER DEFAULT 5,
  chat_right_panel_open BOOLEAN DEFAULT true,

  -- Dashboard Settings
  dashboard_collections JSONB DEFAULT '[]',
  dashboard_theme VARCHAR(50) DEFAULT 'dark',

  -- Preferências gerais
  language VARCHAR(10) DEFAULT 'pt-BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  preferences JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);
```

### 7. **Agents** (Agentes de IA)
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Configuração
  system_prompt TEXT,
  model VARCHAR(100) DEFAULT 'gpt-4',
  temperature REAL DEFAULT 0.7,
  tools JSONB DEFAULT '[]',
  config JSONB DEFAULT '{}',

  -- Estado
  status VARCHAR(50) DEFAULT 'active',
  is_shared BOOLEAN DEFAULT false, -- Compartilhado no tenant
  last_run_at TIMESTAMP,
  total_runs INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_agents_shared ON agents(is_shared) WHERE is_shared = true;
```

### 8. **Agent Runs** (Execuções)
```sql
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  status VARCHAR(50) DEFAULT 'running', -- running, completed, failed

  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  logs TEXT,

  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_user ON agent_runs(user_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_created ON agent_runs(created_at DESC);
```

### 9. **Decisions** (Decisões Estratégicas)
```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  context TEXT NOT NULL,
  outcome TEXT,

  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
  impact VARCHAR(50), -- low, medium, high

  tags TEXT[] DEFAULT '{}',
  linked_notes TEXT[] DEFAULT '{}', -- Paths no Obsidian

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_decisions_tenant ON decisions(tenant_id);
CREATE INDEX idx_decisions_user ON decisions(user_id);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_created ON decisions(created_at DESC);
```

---

## 🔐 Autenticação & Segurança

### Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB
    participant Redis

    Client->>API: POST /api/auth/login {email, password}
    API->>DB: SELECT user WHERE email
    DB-->>API: User data
    API->>API: Verify password (bcrypt)
    API->>API: Generate JWT + Refresh Token
    API->>Redis: Store refresh token
    API-->>Client: {access_token, refresh_token, user}

    Note over Client,API: Requisições subsequentes

    Client->>API: GET /api/conversations (Authorization: Bearer token)
    API->>API: Verify JWT
    API->>API: Extract user_id, tenant_id
    API->>DB: Query with tenant_id filter
    DB-->>API: Results (filtered by tenant)
    API-->>Client: Response
```

### JWT Payload
```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Middleware Stack
```javascript
// server/middleware/auth.js
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  req.user = {
    id: decoded.sub,
    tenant_id: decoded.tenant_id,
    email: decoded.email,
    role: decoded.role
  };

  next();
};

// server/middleware/tenant.js
const tenantMiddleware = (req, res, next) => {
  // Injeta tenant_id em todas as queries
  req.db = db.withTenant(req.user.tenant_id);
  next();
};
```

---

## 🌐 Endpoints da API

### **Authentication**
```
POST   /api/auth/login            - Login (email, password)
POST   /api/auth/logout           - Logout
POST   /api/auth/refresh          - Refresh access token
GET    /api/auth/me               - Current user info
PUT    /api/auth/me               - Update user profile
POST   /api/auth/change-password  - Change password
```

### **Brain Configuration**
```
GET    /api/brain/config          - Get user's brain config
PUT    /api/brain/config          - Update brain config
POST   /api/brain/sync            - Trigger manual sync
GET    /api/brain/status          - Connection status
POST   /api/brain/test-connection - Test MCP connection
```

### **Conversations**
```
GET    /api/conversations              - List conversations
POST   /api/conversations              - Create conversation
GET    /api/conversations/:id          - Get conversation
PUT    /api/conversations/:id          - Update conversation
DELETE /api/conversations/:id          - Delete conversation
POST   /api/conversations/:id/archive  - Archive conversation

GET    /api/conversations/:id/messages - List messages
POST   /api/conversations/:id/messages - Send message (streaming)
```

### **User Settings**
```
GET    /api/settings/user         - Get user settings
PUT    /api/settings/user         - Update settings
PATCH  /api/settings/user/chat    - Update only chat settings
PATCH  /api/settings/user/dashboard - Update only dashboard settings
```

### **Agents**
```
GET    /api/agents                - List agents
POST   /api/agents                - Create agent
GET    /api/agents/:id            - Get agent
PUT    /api/agents/:id            - Update agent
DELETE /api/agents/:id            - Delete agent

POST   /api/agents/:id/run        - Run agent
GET    /api/agents/:id/runs       - List runs
GET    /api/agents/runs/:run_id   - Get run details
```

### **Decisions**
```
GET    /api/decisions             - List decisions
POST   /api/decisions             - Create decision
GET    /api/decisions/:id         - Get decision
PUT    /api/decisions/:id         - Update decision
DELETE /api/decisions/:id         - Delete decision
```

---

## 🔧 Configuração & Deploy

### Variáveis de Ambiente
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ceo_dashboard
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# JWT & Security
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=your-encryption-key-32-characters

# Brain Cloud / MCP
MCP_DEFAULT_SERVER_URL=http://localhost:3001
MCP_TIMEOUT_MS=30000

# Redis (Cache & Sessions)
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_MAX_REQUESTS_AUTH=10

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=https://dashboard.ggai.com
```

### Migrations
```bash
# Criar migration
npm run db:migration:create add_conversations_table

# Executar migrations
npm run db:migrate

# Rollback
npm run db:migrate:rollback
```

---

## 📈 Próximos Passos

### Fase 1 - Fundação (Atual)
- [x] Definir arquitetura multi-tenant
- [ ] Criar migrations do banco de dados
- [ ] Implementar autenticação JWT
- [ ] Implementar middleware de tenant

### Fase 2 - Backend Core
- [ ] Endpoints de conversations + messages
- [ ] Endpoints de brain config
- [ ] Endpoints de user settings
- [ ] Serviço de criptografia (brain configs)

### Fase 3 - Frontend Integration
- [ ] Refatorar ChatPage para usar APIs
- [ ] Context provider para user/tenant
- [ ] Hooks personalizados (useConversations, useSettings)
- [ ] Remover localStorage, migrar para DB

### Fase 4 - Features Avançadas
- [ ] Real-time com WebSockets
- [ ] Cache com Redis
- [ ] Background jobs (sync, agents)
- [ ] Analytics e métricas

### Fase 5 - Deploy & Ops
- [ ] CI/CD pipeline
- [ ] Monitoring (Datadog, Sentry)
- [ ] Backup automatizado
- [ ] Load balancing

---

## 🎓 Princípios de Design

1. **Tenant Isolation**: Todos os dados isolados por `tenant_id`
2. **User Ownership**: Dados pertencem a usuários, compartilhamento é explícito
3. **Fail-Safe**: Brain Cloud offline não bloqueia o dashboard
4. **Audit Trail**: Logs de todas ações críticas
5. **Performance**: Cache agressivo, queries otimizadas
6. **Security First**: Encryption at rest, HTTPS, rate limiting
