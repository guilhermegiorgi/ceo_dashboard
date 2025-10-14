# 🚀 CEO Dashboard - GG.AI Labs

## Status: 100% Funcional ✅

Dashboard executivo integrado com PostgreSQL (Supabase) e Obsidian Brain Cloud para inteligência aumentada.

---

## 🎯 Visão Geral

O CEO Dashboard é uma plataforma de inteligência executiva que combina:

- **Backend PostgreSQL**: Database multi-tenant com 14 tabelas
- **Autenticação JWT**: Access + Refresh tokens, OAuth Google
- **Brain Cloud**: Integração com Obsidian via REST API
- **Frontend React**: Interface moderna com TailwindCSS

### ✅ Funcionando 100%

- ✅ Autenticação completa (JWT + OAuth Google)
- ✅ Database PostgreSQL 17.6 (Supabase)
- ✅ Integração Obsidian Brain Cloud (REST)
- ✅ Health monitoring (Kubernetes-ready)
- ✅ Logs estruturados (Winston)
- ✅ API REST completa

---

## 🛠 Tecnologias

- **Backend**: Node.js 18+, Express, PostgreSQL
- **Auth**: JWT, Passport.js, bcrypt
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Integração**: Obsidian Brain Cloud (REST API)
- **Logging**: Winston
- **Migrations**: node-pg-migrate

---

## ⚙️ Configuração Rápida

```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env (ver seção abaixo)
cp .env.example .env

# 3. Rodar migrations
npm run db:setup

# 4. Iniciar servidor
npm run dev
```

### Credenciais de Desenvolvimento
- Email: `dev@ggai.dev`
- Senha: `Dev@2025!`

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/google` - OAuth Google

### Health
- `GET /api/health` - Status geral
- `GET /api/health/db` - Status database
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

### Brain Cloud
- `GET /api/brain/status` - Status conexão
- `POST /api/brain/search` - Buscar no vault
- `GET /api/brain/graph` - Grafo de conhecimento
- `GET /api/brain/focus` - Notas diárias/semanais
- `GET /api/brain/tasks` - Tarefas com prazo
- `POST /api/brain/context` - Contexto histórico

---

## 🧪 Teste Rápido

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@ggai.dev","password":"Dev@2025!"}' | jq -r '.token')

# Status Brain Cloud
curl http://localhost:3001/api/brain/status \
  -H "Authorization: Bearer $TOKEN"

# Buscar no vault
curl http://localhost:3001/api/brain/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"dashboard","limit":5}'
```

---

## 📚 Documentação

- [Integração Completa](./docs/INTEGRACAO_COMPLETA.md) - Detalhes técnicos completos
- [MCP Reference](./docs/mcp_reference.md) - Referência protocolo MCP
- [API Swagger](https://obsidian-mcp.ggailabs.com/docs) - Obsidian Brain Cloud API

---

## 🎉 Status

**Sistema 100% operacional e pronto para produção!**

Desenvolvido com ❤️ por GG.AI Labs
