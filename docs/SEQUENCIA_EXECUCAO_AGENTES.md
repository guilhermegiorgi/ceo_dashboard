# Sequência de Execução dos Agentes

**Status:** Sistema funcionando com autenticação, mas dados mockados e código legacy.

## 📋 ORDEM DE EXECUÇÃO

### 1️⃣ AGENT 1: Migração PostgreSQL (P0 - CRÍTICO)
**Prompt:** `docs/PROMPT_AGENT1_MIGRACAO_POSTGRESQL.md`  
**Tempo:** 3-4h  
**Dependências:** Nenhuma

**Por que primeiro?**
- Remove SQLite legacy que está causando dados mockados
- Estabelece base de dados sólida para próximos agentes
- Outros agentes precisam de dados reais para testar

**Executar:**
```bash
# Passe o prompt para o agente:
cat docs/PROMPT_AGENT1_MIGRACAO_POSTGRESQL.md
```

**Validar antes de continuar:**
- [ ] `npm run dev` sobe sem erros
- [ ] `/api/projects` retorna dados reais
- [ ] `/api/dashboard/today` funciona
- [ ] Nenhum import de `database.js` (SQLite)

---

### 2️⃣ AGENT 2: Brain Cloud + Chat (P0 - CRÍTICO)
**Prompt:** `docs/PROMPT_AGENT2_BRAINCLOUD_CHAT.md`  
**Tempo:** 3-4h  
**Dependências:** Agent 1 completo

**Por que segundo?**
- Precisa de dashboard routes funcionando (Agent 1)
- Traz dados reais do Obsidian vault
- Chat é funcionalidade core do sistema

**Executar:**
```bash
cat docs/PROMPT_AGENT2_BRAINCLOUD_CHAT.md
```

**Validar antes de continuar:**
- [ ] Dashboard mostra notas/tasks reais do vault
- [ ] Chat processa e responde mensagens
- [ ] Knowledge Graph mostra dados reais
- [ ] Conversas salvas no Brain Cloud

---

### 3️⃣ AGENT 3: Otimizações (P1 - IMPORTANTE)
**Prompt:** `docs/PROMPT_AGENT3_OTIMIZACOES.md`  
**Tempo:** 3-4h  
**Dependências:** Agents 1 e 2 completos

**Por que terceiro?**
- Sistema já funcional após Agents 1 e 2
- Foca em qualidade de código e performance
- Não quebra funcionalidades existentes

**Executar:**
```bash
cat docs/PROMPT_AGENT3_OTIMIZACOES.md
```

**Validar ao final:**
- [ ] Hub reduzido (~2500 linhas)
- [ ] Performance melhorada
- [ ] Build production OK
- [ ] Nenhum warning no console

---

## 🎯 RESULTADO ESPERADO

Após os 3 agentes:

**✅ Sistema Funcional:**
- Todos os dados vindo de PostgreSQL (não mock)
- Obsidian Brain Cloud integrado (dados reais)
- Chat processando mensagens com contexto
- Código limpo e performático

**✅ Métricas:**
- 0 erros no console
- 0 dependências de SQLite
- Hub < 3000 linhas
- Build production success

**✅ Features:**
- Dashboard com dados reais
- Chat funcional com contexto
- Knowledge Graph visual
- Workflows backend pronto

---

## 🚨 SE ALGO DER ERRADO

**Durante Agent 1:**
- Se schema PostgreSQL não funcionar, documente e use schema simplificado
- Não bloquear por decisões de negócio

**Durante Agent 2:**
- Se OpenAI API não configurada, usar resposta mock temporária
- Documentar no commit que precisa configurar API

**Durante Agent 3:**
- Se hook quebrar funcionalidade, reverter
- Priorizar estabilidade sobre redução de código

---

## 📊 PROGRESSO ATUAL

- [x] Sprint 1: Migração Vite → Next.js App Router (95%)
- [x] Sprint 2: Backend consolidation + Auth (100%)
- [ ] Agent 1: PostgreSQL migration (0%)
- [ ] Agent 2: Brain Cloud integration (0%)
- [ ] Agent 3: Optimizations (0%)

**Total estimado:** 9-12h de trabalho dos agentes
**Prioridade:** P0 → P1 (crítico para importante)

---

## 🔄 APÓS CONCLUSÃO

1. Testar sistema completo end-to-end
2. Criar documentação de features
3. Planejar Sprint 3 (features avançadas)
