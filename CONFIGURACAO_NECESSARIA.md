# ⚙️ O QUE PRECISA SER CONFIGURADO

**Data:** 21 de Janeiro de 2025  
**Status Atual:** 🟡 Sistema funcional para DESENVOLVIMENTO, precisa configuração para PRODUÇÃO

---

## 🎯 RESUMO EXECUTIVO

### ✅ O que JÁ FUNCIONA (sem configuração adicional)

- ✅ **Banco de dados** - PostgreSQL conectado ao Supabase
- ✅ **Brain Cloud** - Integração com Obsidian funcionando
- ✅ **Cache** - Redis operacional
- ✅ **Workflows** - Sistema de automação ativo
- ✅ **Interface** - Frontend carregando
- ✅ **Chat** - Funcionando (com limitações)

### ⚠️ O que FUNCIONA mas com DADOS MOCK/TESTE

1. **Autenticação** - Qualquer email/senha funciona (modo desenvolvimento)
2. **Dados iniciais** - Projetos/decisões de exemplo existem no banco
3. **Chat AI** - Usando chave de teste do OpenAI (limitado)

### ❌ O que PRECISA SER CONFIGURADO para PRODUÇÃO

1. **Segurança** - Secrets JWT estão com valores padrão (INSEGURO)
2. **Google OAuth** - Não configurado (usando auth dev)
3. **OpenAI real** - Usando chave de teste

---

## 🔴 AÇÃO IMEDIATA: Para Desenvolvimento

**NADA!** O sistema está pronto para desenvolvimento.

**Você pode:**
1. Fazer login com qualquer email/senha (ex: `dev@ggai.dev` / qualquer senha)
2. Usar todas as funcionalidades
3. Ver dados de exemplo (projetos, decisões)
4. Usar o chat (limitado pela chave de teste)

**Para iniciar:**
```bash
# Basta rodar
npm run dev
```

Acesse: http://localhost:3000

---

## 🟡 OPCIONAL: Limpar Dados de Exemplo

Se você **não quer** ver dados mockados (projetos/decisões de exemplo):

### Opção 1: Via SQL (Recomendado)
```sql
-- Conectar ao banco
psql "postgresql://postgres.dhhfcvpfijyuneikzrtd:***@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

-- Ver quais dados existem
SELECT id, name, created_at FROM projects ORDER BY created_at;

-- CUIDADO: Isso apaga TODOS os projetos
-- DELETE FROM projects;

-- Ou apagar só os de exemplo (mais seguro)
DELETE FROM projects WHERE name IN ('AI Strategy Project', 'Product Launch', 'Customer Analytics');
DELETE FROM decisions WHERE title LIKE '%Example%' OR title LIKE '%Sample%';
```

### Opção 2: Desabilitar Seed na Migration
```javascript
// Em migrations/1710000000012_seed-development-data.cjs
// Já está configurado para NÃO rodar em produção

// Para forçar não executar em dev também, comente o conteúdo:
exports.up = async (pgm) => {
  // Desabilitado manualmente
  return;
};
```

---

## 🟢 RECOMENDADO: Para Produção

Se você vai usar em **produção real** (não local), configure:

### 1. Gerar Secrets Seguros (CRÍTICO)

```bash
# Execute estes comandos para gerar secrets
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo "SESSION_SECRET=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

**Atualize no `.env`:**
```env
# ANTES (INSEGURO):
JWT_SECRET=change-this-to-a-secure-random-string-in-production
JWT_REFRESH_SECRET=change-this-to-another-secure-random-string
SESSION_SECRET=change-this-session-secret-to-random-string
ENCRYPTION_KEY=change-this-to-a-32-character-key

# DEPOIS (SEGURO):
JWT_SECRET=<valor-gerado-acima>
JWT_REFRESH_SECRET=<valor-gerado-acima>
SESSION_SECRET=<valor-gerado-acima>
ENCRYPTION_KEY=<valor-gerado-acima>
```

### 2. Configurar OpenAI Real (IMPORTANTE)

**Atual:** `OPENAI_API_KEY=sk-test-key-for-development` (limitado)

**Como obter chave real:**
1. Vá em https://platform.openai.com/api-keys
2. Crie uma nova API key
3. Copie a chave (começa com `sk-proj-...`)

**Atualize no `.env`:**
```env
OPENAI_API_KEY=sk-proj-sua-chave-real-aqui
VITE_OPENAI_API_KEY=sk-proj-sua-chave-real-aqui
```

### 3. Configurar Google OAuth (OPCIONAL)

**Atual:** Login aceita qualquer email/senha (apenas dev)

**Se quiser Google OAuth:**
1. Vá em https://console.cloud.google.com/
2. Crie projeto
3. Ative Google+ API
4. Crie credenciais OAuth 2.0
5. Adicione redirect URI: `http://localhost:3002/api/auth/google/callback`

**Atualize no `.env`:**
```env
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
```

---

## 📊 Checklist Rápido

### Para DESENVOLVIMENTO (Agora)
- [x] Banco de dados configurado
- [x] Brain Cloud configurado
- [x] Sistema iniciando
- [x] Frontend funcionando
- [ ] Reiniciar backend: `npm run dev`

### Para PRODUÇÃO (Quando for lançar)
- [ ] Secrets JWT alterados
- [ ] OpenAI API key real
- [ ] Google OAuth configurado (opcional)
- [ ] Seed data removido
- [ ] NODE_ENV=production
- [ ] SSL/HTTPS configurado
- [ ] Backups configurados

---

## 🚀 Como Iniciar AGORA

```bash
# 1. Certifique-se que está no diretório
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard

# 2. Inicie o sistema
npm run dev

# 3. Acesse no navegador
# http://localhost:3000

# 4. Faça login com qualquer email/senha
# Exemplo: dev@ggai.dev / Dev@2025!
```

**Pronto!** Sistema funcionando em modo desenvolvimento.

---

## ❓ FAQ

### P: Os dados mockados vão aparecer sempre?
**R:** Sim, enquanto não forem removidos do banco. São dados de exemplo criados pela migration de seed.

### P: Posso usar em produção assim?
**R:** NÃO! Precisa configurar os secrets e API keys reais primeiro (veja seção "Para Produção").

### P: O chat vai funcionar sem OpenAI key?
**R:** Funciona com chave de teste, mas tem limitações de rate limit e funcionalidades.

### P: Como saber se estou usando dados reais ou mock?
**R:** 
- Dados mock tem nomes como "AI Strategy Project", "Sample Decision"
- Dados reais são os que você criar
- Para garantir: limpe o banco e crie seus próprios dados

### P: Preciso configurar tudo agora?
**R:** 
- **Para testar/desenvolver:** NÃO
- **Para produção:** SIM (pelo menos secrets e OpenAI key)

---

## 📞 Suporte

**Se tiver problemas:**

1. Verifique logs: `tail -f logs/server.log`
2. Teste health: `curl http://localhost:3002/api/health`
3. Veja documentação completa: `docs/SYSTEM_STATUS_AND_CONFIGURATION_GUIDE.md`

---

**Status Final:** ✅ Pronto para DESENVOLVIMENTO | ⚠️ Precisa configuração para PRODUÇÃO

**Próximo passo:** Apenas `npm run dev` e começar a usar!
