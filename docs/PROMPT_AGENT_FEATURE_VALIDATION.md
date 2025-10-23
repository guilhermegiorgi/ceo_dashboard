# ✅ PROMPT_AGENT_FEATURE_VALIDATION - Validar Todas as Features Implementadas

**Objetivo:** Executar testes manuais completos de todas as 6 features implementadas (Agents 3-6) para garantir integração e funcionalidade

**Tempo Estimado:** 1-2 horas

**Contexto:**
- 6 agentes concluíram implementação
- Testes E2E ainda não foram executados
- Precisa validar integração entre features
- Developer mode funciona, production build falha (Html error)

---

## 📋 TAREFAS

### 1. Setup e Preparação (10 min)

**1.1 Iniciar aplicação em modo dev:**
```bash
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard

# Matar processos antigos
pkill -f "npm run dev" || true
pkill -f "node server" || true
sleep 2

# Iniciar dev
npm run dev:frontend &
FRONTEND_PID=$!
sleep 5

# Iniciar backend (em outro terminal/processo)
npm run dev:backend &
BACKEND_PID=$!
sleep 5

echo "Frontend PID: $FRONTEND_PID"
echo "Backend PID: $BACKEND_PID"
```

**1.2 Verificar se aplicação subiu:**
```bash
# Testar endpoints
curl http://localhost:3000/ 2>&1 | grep -i "<!DOCTYPE\|html\|error" | head -3
curl http://localhost:3002/api/dashboard/today 2>&1 | grep -i "error\|tasks\|notes" | head -3
```

---

### 2. Validar Agent 3 - Hub Refatorado + Hooks (15 min)

**2.1 Verificar se BusinessIntelligenceHub renderiza sem erros:**

Abrir browser:
```
http://localhost:3000/
```

- ✅ Dashboard carrega sem erros console
- ✅ Todas as abas visíveis (Chat, Tasks, Inbox, Timeline, Knowledge Graph)
- ✅ Sem warnings do React sobre hooks

**2.2 Validar cada hook está funcionando:**

No console do browser, verificar cada aba:

```javascript
// Tasks aba
- Clique em "Tasks"
- Verifique se lista de tarefas carrega
- Clique em diferentes task views (List, Board, Grid)
- Confirmação: ✅ useTasksState funcionando

// Inbox aba
- Clique em "Inbox"
- Verifique se notas carregam
- Clique em nota para expandir
- Confirmação: ✅ useInboxState funcionando

// Timeline aba
- Clique em "Timeline"
- Verifique se eventos carregam
- Verifique chat messages aparecem
- Confirmação: ✅ useTimelineState funcionando

// Knowledge Graph
- Clique em "Knowledge Graph"
- Verifique se grafo renderiza (pode ser lento)
- Confirmação: ✅ Funcionando (ou placeholder se desabilitado)
```

**2.3 Verificar no console do browser:**
```javascript
// Abrir console (F12) e verificar
console.log("Erros iniciais: nenhum esperado")
```

---

### 3. Validar Agent 4 - Chat Tools + MCP (15 min)

**3.1 Testar Chat Widget:**

- ✅ Clique em aba "Chat Preview"
- ✅ Widget carrega com input de mensagem
- ✅ Envie uma mensagem simples
- ✅ Resposta aparece com formatação

**3.2 Testar MCP Tool Renderers:**

No chat, envie comandos que triguerem ferramentas:
```
"busque tarefas de IA"
"mostre o grafo de conhecimento"
"liste minhas notas recentes"
```

Verificar:
- ✅ SearchToolRenderer: Resultados formatados aparecem
- ✅ GraphToolRenderer: Visualização de nós aparece
- ✅ TaskToolRenderer: Status de tarefas renderia
- ✅ Nenhum erro no console

**3.3 Testar Shortcuts + History:**

- ✅ Pressione F1 (ou botão de atalhos)
- ✅ Painel de atalhos abre com 6 comandos
- ✅ Pressione F2 (histórico)
- ✅ Histórico de conversas carrega
- ✅ Possa deletar histórico

---

### 4. Validar Agent 5 - Analytics Dashboard (20 min)

**4.1 Acessar Analytics:**

- ✅ Procure por botão "Analytics" na dock lateral
- ✅ Clique para abrir aba "Analytics"
- ✅ Dashboard carrega sem erros

**4.2 Validar Componentes de Métrica:**

Verificar se cada componente renderiza:
```
- ✅ Metric Cards:
  - Total Tasks (número visível)
  - Completion Rate (%)
  - Total Notes
  - Graph Density

- ✅ 6 Charts devem aparecer:
  - TaskPieChart (pizza de distribuição)
  - PriorityBarChart (barra de prioridades)
  - AreaPieChart (pizza por área: IA/Agro/Crypto)
  - AreaCompletionChart (taxa conclusão por área)
  - TimelineChart (7 dias de atividade)
  - ActiveTimeChart (tempo por dia)

- ✅ Area Metrics Table:
  - Mostra dados por área
  - Valores viáveis (não NaN/undefined)
```

**4.3 Testar Refresh:**

- ✅ Clique botão "Refresh Data"
- ✅ Dados atualizam
- ✅ Sem erro de rede/console

**4.4 Validar dados:**

Verificar se dados fazem sentido:
- Completion rate está entre 0-100%
- Total tasks > 0 (se houver tarefas)
- Graph density 0-1 range
- Sem valores NaN/undefined

---

### 5. Validar Agent 6 - Workflows & Automations (20 min)

**5.1 Acessar Workflows:**

- ✅ Procure por botão "Flows" na dock lateral
- ✅ Clique para abrir aba "Workflows"
- ✅ Página carrega sem erros

**5.2 Validar Lista de Workflows:**

Verificar que aparecem 4 workflows:
```
- ✅ Daily Review (07:30)
- ✅ Weekly Review (Domingo 18:00)
- ✅ Daily Sync (06:00)
- ✅ Weekly Embeddings (Segunda 02:00)
```

Cada workflow deve mostrar:
- ✅ Nome
- ✅ Status (Enabled/Disabled toggle)
- ✅ Próxima execução
- ✅ Descrição

**5.3 Testar Execução Imediata:**

Para cada workflow:
- ✅ Clique "Execute Now"
- ✅ Loading spinner aparece
- ✅ Status muda para "Running"
- ✅ Após 5-30 segundos, status muda para "Success" ou "Error"
- ✅ Histórico registra execução

**5.4 Validar Histórico:**

- ✅ Clique em workflow para expandir
- ✅ Histórico mostra últimas 5-10 execuções
- ✅ Cada execução tem:
  - Timestamp
  - Status (✅/❌/⏳)
  - Duração
  - Resultado (sucesso/erro)

**5.5 Verificar Backend:**

```bash
# Ver logs do servidor
# Procurar por mensagens de workflow agendadas
tail -50 /tmp/server.log 2>/dev/null | grep -i "workflow\|scheduler"

# Ou verificar console do servidor rodando
# Deve mostrar: "✅ Workflow Scheduler inicializado"
```

---

### 6. Validar Integração Completa (15 min)

**6.1 Teste de fluxo end-to-end:**

```
1. Abra Dashboard (Hub)
2. Vá para Tasks (valida useTasksState)
3. Abra Chat (valida chat tools)
4. Envie comando MCP (valida renderers)
5. Abra Analytics (valida dados)
6. Abra Workflows (valida automações)
7. Execute um workflow
8. Volte para Analytics e clique Refresh
9. Dados devem estar atualizados
```

- ✅ Nenhum erro durante todo fluxo
- ✅ Transições entre abas suaves
- ✅ Dados consistentes

**6.2 Verificar Performance:**

Abrir DevTools (F12 → Performance tab):

```javascript
// Medir tempo de carregamento
console.time("dashboard-load");
// Abra diferentes abas...
console.timeEnd("dashboard-load");

// Verificar memoria
console.log(performance.memory);
```

Esperado:
- ✅ Dashboard carrega em < 3 segundos
- ✅ Abas trocam em < 500ms
- ✅ Sem memory leaks óbvios

---

## 📊 CHECKLIST DE VALIDAÇÃO

Copiar e preencher:

```markdown
## Validação de Features - Checklist

### Agent 3 - Hub + Hooks
- [ ] Hub renderiza sem erros
- [ ] Tasks tab funciona
- [ ] Inbox tab funciona
- [ ] Timeline tab funciona
- [ ] Knowledge Graph (funciona ou placeholder OK)

### Agent 4 - Chat Tools
- [ ] Chat widget funciona
- [ ] Messages enviam/recebem
- [ ] SearchToolRenderer funciona
- [ ] GraphToolRenderer funciona
- [ ] F1 (shortcuts) funciona
- [ ] F2 (history) funciona

### Agent 5 - Analytics
- [ ] Analytics aba abre
- [ ] Metric cards renderizam
- [ ] 6 charts renderizam
- [ ] Area table renderiza
- [ ] Refresh funciona
- [ ] Dados fazem sentido

### Agent 6 - Workflows
- [ ] Workflows aba abre
- [ ] Lista 4 workflows
- [ ] "Execute Now" funciona
- [ ] Histórico registra
- [ ] Status atualiza
- [ ] Nenhum erro

### Integração
- [ ] End-to-end flow OK
- [ ] Performance OK
- [ ] Nenhum error no console
- [ ] Dados consistentes
```

---

## 🎯 DELIVERABLE

Criar arquivo: `docs/FEATURE_VALIDATION_REPORT.md`

Conteúdo:
- [ ] Checklist preenchido (✅/❌)
- [ ] Screenshots de cada feature (se possível)
- [ ] Bugs encontrados (lista)
- [ ] Performance metrics
- [ ] Recomendações
- [ ] Status geral (PASS/FAIL)

---

## 📞 SE ENCONTRAR BUGS

1. **Documentar exatamente:**
   - O que foi feito
   - O que esperava acontecer
   - O que aconteceu
   - Screenshots/console errors

2. **Tentar isolado:**
   - Bug ocorre em modo dev?
   - Bug ocorre em componente isolado?

3. **Não tentar corrigir:**
   - Apenas documentar para análise futura

---

✅ **Sucesso:** Todas as features validadas e documentadas
❌ **Falha:** Bugs documentados para correção posterior

🚀 **Próximo:** Agent 7 com testes automatizados + Agent Report (consolidação)
