# 🔍 PROMPT_AGENT_HTML_INVESTIGATION - Investigar Erro de Build HTML

**Objetivo:** Encontrar e DOCUMENTAR a raiz do erro `<Html> should not be imported outside of pages/_document` que bloqueia build de produção

**Tempo Estimado:** 45-60 minutos

**Contexto:**
- Erro ocorre ao prerender `/404` e `/500` pages
- Agent Build Fix aplicou paliativo (lazy loading, providers separados)
- **NÃO é bug do Next.js 15.5.6** (verificado)
- **Problema está no NOSSO CÓDIGO**

---

## 📋 TAREFAS

### 1. Análise Estática do Código (15 min)

**1.1 Procurar imports/exports diretos de Html:**
```bash
# Buscar qualquer referência a "Html" component
grep -r "Html" /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src \
  --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | grep -v ".next"

# Buscar "html" em minúsculas também
grep -r "<html>" /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src \
  --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules

# Verificar app router error pages
find /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/app -name "error.tsx" -o -name "not-found.tsx" -o -name "global-error.tsx" | xargs cat
```

**1.2 Procurar componentes que retornam Html:**
```bash
# Procurar padrão: "return <html" ou "return (<html"
grep -r "return.*<html\|return.*<Html" \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src \
  --include="*.tsx" --include="*.ts" 2>/dev/null
```

---

### 2. Análise de Componentes Dinâmicos (15 min)

**2.1 Verificar lazy loading e Suspense:**
```bash
# Procurar React.lazy
grep -r "React.lazy\|dynamic" \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src \
  --include="*.tsx" -B 2 -A 2 | head -50

# Procurar Suspense
grep -r "<Suspense" \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src \
  --include="*.tsx" -B 2 -A 2 | head -50
```

**2.2 Verificar BusinessIntelligenceHub:**
```bash
# Linhas 70-85 (imports lazy)
sed -n '70,85p' /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src/components/BusinessIntelligenceHub.tsx

# Procurar renderização condicional
grep -n "ui.activeUtility\|activeView\|renderContent" \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src/components/BusinessIntelligenceHub.tsx | head -20
```

---

### 3. Procurar Erros de Hidratação (10 min)

**Possível causa:** Componente renderiza diferente no servidor vs cliente

```bash
# Procurar padrões que causam mismatches:
# 1. useEffect sem verificação de cliente
grep -r "useEffect.*\[\]" \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src/components \
  --include="*.tsx" | grep -v "useCallback\|useMemo" | head -20

# 2. Math.random ou timestamps
grep -r "Math.random\|Date.now\|crypto.random" \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src/components \
  --include="*.tsx" | head -10

# 3. window/document access direto
grep -r "typeof window\|window\.\|document\." \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src/components \
  --include="*.tsx" | grep -v "useEffect\|typeof window" | head -20
```

---

### 4. Testar Error Pages Isoladamente (10 min)

**4.1 Criar página de erro simples para testar:**
```bash
# Tentar renderizar /404 diretamente
curl http://localhost:3002/404 2>&1 | head -20 &

# Ou se estiver em dev mode
npm run dev:frontend &
# Esperar 10 segundos
sleep 10
curl http://localhost:3000/404 2>&1 | grep -i error | head -10
```

**4.2 Verificar stack trace detalhado do build:**
```bash
# Limpar .next
rm -rf /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/.next

# Build com mais verbosidade
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard
npm run build 2>&1 | grep -A 20 "Error occurred"
```

---

### 5. Analisar Possíveis Causas (15 min)

Baseado em investigação acima, determinar qual é a causa:

**Opção A: Componente sem Suspense boundary**
- Procurar: useEffect assíncrono em componente renderizado no erro page
- Fix: Envolver em Suspense + fallback

**Opção B: Erro de hidratação**
- Procurar: Dados diferentes servidor vs cliente
- Fix: Usar `useLayoutEffect` ou verificar `typeof window`

**Opção C: Problemas com use client / server**
- Procurar: `use client` em componente que acessa server-only code
- Fix: Separar em componentes cliente/servidor

**Opção D: Lazy loading conflita com error pages**
- Procurar: React.lazy em nível módulo que afeta pages
- Fix: Mover lazy para dentro de componente

---

## 📊 SAÍDA ESPERADA

### Formato do Relatório:

```markdown
# Investigação Erro HTML Build

## 1. Problema Identificado
[Descrever exatamente qual é o problema]

## 2. Localização
- Arquivo: [arquivo específico]
- Linhas: [números]
- Função/Componente: [nome]

## 3. Causa Raiz
[Explicar por que o erro ocorre]

## 4. Impacto
- Dev mode: [funciona / não funciona]
- Build: [falha em x componentes]
- Produção: [bloqueado / não bloqueado]

## 5. Recomendação de Fix
[Código específico para corrigir]

## 6. Evidências
[Grep outputs, stack traces, etc]
```

---

## ✅ CRITÉRIO DE SUCESSO

✅ **Identificar:** Componente/arquivo específico causando erro
✅ **Documentar:** Causa raiz com stack trace
✅ **Propor:** Fix específico (não genérico)
✅ **Validar:** Testar se fix resolveria (sem aplicar se possível)

---

## 🎯 DELIVERABLE

Criar arquivo: `docs/HTML_BUILD_ERROR_INVESTIGATION.md`

Conteúdo:
- [ ] Problema identificado
- [ ] Localização exata
- [ ] Causa raiz
- [ ] Fix proposto com código
- [ ] Testes sugeridos
- [ ] Commit message sugerida

---

## 📞 SE BLOQUEAR

1. Descrever qual etapa ficou preso
2. Incluir output de grep/error exato
3. Indicar se é verdadeiramente um bug ou configuração
4. Deixar documentado para análise futura

---

🚀 **Objetivo:** Ter investigação completa e pronta para ser convertida em fix definitivo por Agent posterior.
