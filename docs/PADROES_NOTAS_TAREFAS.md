# 📝 Padrões e Convenções: Notas, Tarefas e Projetos

**Última atualização:** 2025-10-21  
**Status:** 🟢 Ativo e obrigatório para novos agentes

---

## 🎯 Objetivo

Definir padrões claros para criação e gerenciamento de notas, tarefas e projetos no dashboard, garantindo:
- ✅ Consistência na estrutura
- ✅ Compatibilidade com MCP e REST API
- ✅ Editabilidade via dashboard
- ✅ Integração perfeita Obsidian ↔ Dashboard

---

## 📂 Estrutura de Diretórios

### **Áreas Editáveis (Dashboard + MCP)**
```
5 - INSIGHTS-IA/
├── Conversas/       # Histórico de conversas LLM
├── Daily/           # Notas diárias curadas
├── Inbox/           # Notas brutas (captura rápida)
├── Projetos/        # Projetos gerenciáveis pelo dashboard ⭐
├── Tarefas/         # Tasks individuais
├── Lembretes/       # Lembretes e alertas
├── Reunioes/        # ATAs e notas de reunião
├── Relatorios/      # Relatórios gerados
├── Clientes/        # Informações de clientes
└── Financeiro/      # Dados financeiros
```

### **Áreas Somente Leitura (Dashboard) - Padrão**
```
0 - DASHBOARD/       # Visualização apenas
1 - PROJETOS/        # Leitura apenas (editar no Obsidian) ⚠️
2 - ÁREAS/           # Leitura apenas
3 - RECURSOS/        # Leitura apenas
4 - ARQUIVO/         # Leitura apenas
```

### **🔓 Modo Admin: Edição Temporária em Todos os Diretórios**

Para ambientes de **desenvolvimento** ou **migração de dados**, é possível habilitar temporariamente a edição em todos os diretórios:

#### **Via Dashboard (Configurações do Sistema)**
1. Acesse **Settings → Sistema** (ícone do avatar na sidebar)
2. Ative o toggle **"Permitir edição em todos os diretórios"**
3. Salve as configurações
4. O sistema ativa o modo admin por **600 segundos (10 minutos)**
5. Após o TTL expirar, volta ao modo restrito automaticamente

#### **Via API (Brain Cloud MCP)**
```bash
# Habilitar por 10 minutos
curl -X POST http://localhost:3100/api/v1/security/path-override/enable \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttl_seconds": 600}'
```

**⚠️ Avisos de Segurança:**
- **APENAS para desenvolvimento/migração**: Não use em produção com vault pessoal
- **TTL automático**: Expira após o tempo definido (padrão: 10min)
- **Token Admin obrigatório**: Requer `ADMIN_API_TOKEN` válido
- **Uso comercial**: Em produção, todas as pastas serão gerenciadas pelo dashboard naturalmente

---

## 📋 Padrões de Frontmatter

### **1. Notas de Projeto (em `5 - INSIGHTS-IA/Projetos/`)**

```yaml
---
tipo: projeto
status: em_andamento  # ou: concluída, pausado, arquivado
due: 2025-12-31       # Formato ISO: YYYY-MM-DD
priority: alta        # ou: media, baixa
tags:
  - projeto
  - cliente-xpto
area: IA 🤖           # ou: AGRO 🌿, CRYPTO 💰, TECH ⚙️
progress: 45          # Porcentagem (0-100)
responsavel: Guilherme Giorgi
---
```

**⚠️ Campos obrigatórios:**
- `tipo`: sempre "projeto"
- `status`: sempre presente
- `due`: data no formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS)

**❌ Não usar:**
- ~~`deadline:`~~ → Use `due:`
- ~~`due_date:`~~ → Use `due:`
- ~~`dueDate:`~~ → Use `due:`

---

### **2. Tasks (Checkbox)**

#### **Em nota de projeto:**
```markdown
## Próximas Ações

- [ ] Implementar API de pagamentos @alta 📅 2025-11-15
- [ ] Revisar documentação @media 📅 2025-11-20
- [x] Setup inicial ✅ 2025-10-15
```

#### **Arquivo individual (`5 - INSIGHTS-IA/Tarefas/`):**
```yaml
---
tipo: task
status: em_andamento
due: 2025-11-15
priority: alta
projeto: "[[PROJETO - API Pagamentos]]"
tags:
  - dev
  - backend
---

# Implementar API de Pagamentos

## Contexto
...

## Checklist
- [ ] Estudar gateway XYZ
- [ ] Criar endpoints
- [ ] Testar integração
```

---

### **3. Notas Diárias (`5 - INSIGHTS-IA/Daily/`)**

```yaml
---
tipo: daily
date: 2025-10-21
tags:
  - resumo
  - daily-note
---

# 📅 2025-10-21 - Segunda-feira

## 🎯 Destaques
...

## 💡 Insights
...

## ✅ Tarefas Concluídas
- [x] ...
```

---

### **4. Conversas (`5 - INSIGHTS-IA/Conversas/`)**

```yaml
---
tipo: conversa
source: claude         # ou: chatgpt, gemini, perplexity, custom
date: 2025-10-21
projeto: Marketing 2026
tags:
  - ia
  - marketing
url: https://claude.ai/chat/abc123
---

# Conversa: Plano de Marketing 2026

## Mensagens
...
```

---

## 🔄 Regras de Sincronização

### **Tasks → Dashboard**
1. ✅ **Checkbox tasks** (markdown `- [ ]`):
   - Precisam ter `line_number` para toggle
   - Dashboard atualiza `[ ]` ↔ `[x]`
   
2. ✅ **Notas de projeto** (frontmatter):
   - `lineNumber: null` indica projeto
   - Dashboard atualiza `status:` no frontmatter
   - **APENAS se estiver em `5 - INSIGHTS-IA/`**

3. ❌ **Projetos em `1 - PROJETOS/`**:
   - Somente leitura no dashboard
   - Exibir aviso: "Abra no Obsidian para editar"

### **Dashboard → Obsidian**
- Todas as edições vão via Brain Cloud MCP
- Sincronização automática (SSE + polling 60s)
- Conflitos exibem diff para resolução manual

### **Path Override (Modo Admin)**
Quando `allowEditAllDirectories` está ativo:
1. Dashboard chama `POST /api/v1/security/path-override/enable`
2. Brain Cloud MCP permite escrita em qualquer path por TTL definido
3. Dashboard salva timestamp de expiração localmente
4. Ao expirar, retorna ao modo restrito (apenas `5 - INSIGHTS-IA/`)
5. Notificação visual indica quando modo admin está ativo

---

## 🎨 Nomenclatura de Arquivos

### **Projetos**
```
PROJETO - [NOME DO PROJETO].md

Exemplos:
✅ PROJETO - CEO DASHBOARD.md
✅ PROJETO - AGROCULTIVIA.md
❌ projeto-ceo-dashboard.md
❌ Novo Projeto.md
```

### **Tasks**
```
TASK - [DESCRIÇÃO CURTA].md

Exemplos:
✅ TASK - Implementar OAuth Google.md
✅ TASK - Revisar documentação API.md
```

### **Daily Notes**
```
YYYY-MM-DD.md

Exemplos:
✅ 2025-10-21.md
✅ 2025/10/2025-10-21.md (em subpastas por ano/mês)
```

### **Conversas**
```
YYYY-MM-DD - [SOURCE] - [ID_CURTO].md

Exemplos:
✅ 2025-10-21 - claude - session-abc123.md
✅ 2025-10-21 - chatgpt - marketing-plan.md
```

---

## 🤖 Diretrizes para Agentes

### **Ao criar notas de projeto:**
```javascript
const frontmatter = {
  tipo: "projeto",
  status: "em_andamento",
  due: "2025-12-31",           // ISO date
  priority: "alta",
  tags: ["projeto", "cliente"],
  area: "IA 🤖",
  progress: 0
};

const path = "5 - INSIGHTS-IA/Projetos/PROJETO - NOME.md";
```

### **Ao criar tasks:**
```javascript
// Opção 1: Checkbox em nota existente
const content = `
## Próximas Ações
- [ ] Nova task @alta 📅 2025-11-15
`;

// Opção 2: Arquivo individual
const frontmatter = {
  tipo: "task",
  status: "em_andamento",
  due: "2025-11-15",
  priority: "alta"
};
```

### **Ao salvar conversas:**
```javascript
await saveConversationHistory({
  source: "claude",
  conversation_id: "session-abc",
  messages: [...],
  metadata: {
    project: "Marketing 2026",
    tags: ["marketing"],
    url: "https://..."
  },
  save_to_vault: true  // força salvamento
});
```

---

## ⚠️ Casos Especiais

### **Migração de notas antigas**
- Projetos em `1 - PROJETOS/` permanecem lá (somente leitura)
- Novos projetos **devem** ser criados em `5 - INSIGHTS-IA/Projetos/`
- Usar template: `create_note_from_template('project', {...})`

### **Deadline vs Due**
- **SEMPRE usar `due:`** em novos arquivos
- Dashboard aceita `due_date:`, `deadline:`, `dueDate:` por compatibilidade
- Brain Cloud MCP normaliza para `due_date` internamente

### **Status permitidos**
```yaml
status: em_andamento  # Em progresso
status: concluída     # Finalizado
status: pausado       # Temporariamente pausado
status: arquivado     # Arquivado (não aparece em views)
status: cancelado     # Cancelado
```

---

## 📊 Validação Automática

O sistema **deve validar**:

1. ✅ Nota em `5 - INSIGHTS-IA/` → editável
2. ✅ Nota com frontmatter → parse correto
3. ✅ Campo `due:` → formato ISO válido
4. ✅ Campo `status:` → valor permitido
5. ❌ Nota fora de área editável → aviso claro

---

## 🔮 Roadmap

### **Fase 1** (Atual)
- [x] Parser MCP para tasks
- [x] Toggle checkbox + frontmatter
- [x] Validação de área editável

### **Fase 2** (Próxima)
- [ ] Template engine para criação de notas
- [ ] Migração assistida de `1 - PROJETOS/` → `5 - INSIGHTS-IA/Projetos/`
- [ ] Validador de frontmatter

### **Fase 3** (Futuro)
- [ ] Agente autônomo de criação de notas
- [ ] Sugestões automáticas de due dates
- [ ] Análise de progresso por projeto

---

## 📚 Referências

- [MCP Reference](/docs/mcp_reference.md)
- [API Reference](/docs/api_reference.md)
- [Definições do Sistema](/docs/DEFINICOES_SISTEMA_PREENCHIDO.md)
- [Questionário de Setup](/docs/QUESTIONARIO_DEFINICAO_SISTEMA.md)

---

**Status:** 🟢 Documento vivo - atualizar conforme evolução do sistema  
**Responsável:** Guilherme Giorgi + Sophia 3.0  
**Revisão:** Mensal ou após mudanças significativas
