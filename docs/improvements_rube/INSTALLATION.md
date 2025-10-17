# 📖 Guia de Instalação - Enhanced Chat & Sandbox

## Pré-requisitos

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Git
- Python 3.8+ (opcional, para sandbox Python)

## Passo a Passo

### 1️⃣ Criar Branch de Desenvolvimento

```bash
cd ~/seu_repo/ceo_dashboard

# Verificar branch atual
git branch

# Criar branch a partir de main
git checkout main
git pull origin main
git checkout -b feature/enhanced-chat-sandbox-mcp

# Verificar que está na branch correta
git branch -v
# * feature/enhanced-chat-sandbox-mcp abc123 Commit message
```

### 2️⃣ Copiar Arquivos

```bash
# Criar diretórios se não existirem
mkdir -p server/services
mkdir -p server/routes
mkdir -p migrations

# Copiar arquivos gerados
cp /home/user/ceo_dashboard_improvements/server/services/* server/services/
cp /home/user/ceo_dashboard_improvements/server/routes/chat.js server/routes/
cp /home/user/ceo_dashboard_improvements/migrations/*.js migrations/
```

### 3️⃣ Integrar Rotas no Server

Editar `server/index.js` e adicionar:

```javascript
// Perto das outras imports
import chatRoutes from './routes/chat.js';

// Depois das outras rotas (ex: '/api/agents')
app.use('/api/chat', chatRoutes);

// Importante: Adicionar APÓS autenticação mas ANTES error handler
```

### 4️⃣ Rodar Migrations

```bash
# Criar a migration no formato esperado (nome + timestamp)
npm run migrate -- --create chat_and_workbench

# Ou usar script existente
npm run db:setup
```

### 5️⃣ Verificar Configurações de Ambiente

Adicionar ao `.env`:

```bash
# Brain Cloud MCP
BRAINCLOUD_API_TOKEN=seu_token_aqui
BRAINCLOUD_BASE_URL=https://obsidian-mcp.ggailabs.com

# Sandbox (opcional)
SANDBOX_MAX_TIMEOUT=30000
SANDBOX_MAX_MEMORY=512

# Chat
CHAT_MAX_HISTORY=100
CHAT_CACHE_TTL=300000
```

### 6️⃣ Testar Instalação

```bash
# Terminal 1: Iniciar servidor
npm run dev:backend

# Terminal 2: Testar endpoints
curl -X POST http://localhost:3001/api/chat/conversations \
  -H "Authorization: Bearer seu_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"agentId": null}'

# Resposta esperada:
# {
#   "success": true,
#   "data": {
#     "id": "uuid-string",
#     "userId": 1,
#     "messages": [],
#     ...
#   }
# }
```

### 7️⃣ Testar Sandbox Execution

```bash
curl -X POST http://localhost:3001/api/chat/execute \
  -H "Authorization: Bearer seu_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-uuid",
    "code": "console.log(\"Hello Sandbox!\")",
    "language": "javascript"
  }'
```

### 8️⃣ Testar MCP Integration

```bash
# Verificar se Brain Cloud está acessível
curl -X POST https://obsidian-mcp.ggailabs.com/api/mcp/tools/mcp_list_files \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

## 🐛 Troubleshooting

### Erro: "Cannot find module 'remoteWorkbench'"

**Solução**: Verificar que os arquivos estão em `server/services/`

```bash
ls -la server/services/remote*
```

### Erro: "Migration not found"

**Solução**: Rodar migrate manualmente

```bash
npm run migrate:up
```

### Erro: "Brain Cloud connection failed"

**Solução**: Verificar token e URL

```bash
# Testar conexão
curl -I https://obsidian-mcp.ggailabs.com/health

# Verificar .env
cat .env | grep BRAIN
```

### Sandbox não executa Python

**Solução**: Instalar Python

```bash
# Linux/Mac
python3 --version

# Windows
python --version
```

## ✅ Validação

Após instalação, validar:

- [ ] Servidor inicia sem erros
- [ ] POST /api/chat/conversations retorna 201
- [ ] Conversa criada com sessionId válido
- [ ] Mensagem enviada com sucesso
- [ ] Código executado no sandbox
- [ ] Brain Cloud tools respondendo
- [ ] Histórico persistido no DB

## 📚 Próximas Etapas

1. **Integração Frontend**: Criar componente ChatBox em React
2. **Testes E2E**: Adicionar testes com Playwright
3. **Monitoring**: Adicionar logs e métricas
4. **Otimização**: Performance tuning based on metrics

## 🆘 Suporte

Se encontrar problemas:

1. Verificar logs: `tail -f ~/.pm2/logs/app-error.log`
2. Debug mode: `DEBUG=ceo:* npm run dev`
3. Check database: `psql -d ceo_dashboard`

