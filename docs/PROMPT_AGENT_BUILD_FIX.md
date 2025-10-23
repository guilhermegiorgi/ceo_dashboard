# 🔧 PROMPT_AGENT_BUILD_FIX - Resolver Erro de Build (Html Component)

**Objetivo:** Resolver o erro `<Html> should not be imported outside of pages/_document` que impede o build de produção

**Tempo Estimado:** 30-45 minutos

**Status do Erro:**
```
Error: <Html> should not be imported outside of pages/_document.
Read more: https://nextjs.org/docs/messages/no-document-import-in-page
    at x (.next/server/chunks/611.js:6:1351)
Error occurred prerendering page "/404".
```

---

## 📋 TAREFAS

### 1. Diagnosticar a Origem do Erro (5 min)

**Contexto:**
- Next.js 15.5.6 com App Router
- Erro ocorre ao tentar prerender `/404` e `/_error`
- `app/global-error.tsx` já foi corrigido (removidas tags `<html>`)
- `app/not-found.tsx` contém apenas `<div>`

**Objetivo:** Encontrar qual arquivo está importando/exportando o componente `<Html>`

**Ações:**

1. Buscar importações de `Html` em todo o projeto:
   ```bash
   grep -r "import.*Html\|import.*{.*Html\|import.*\bHtml\b" \
     /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard \
     --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
     2>/dev/null | grep -v node_modules | head -30
   ```

2. Buscar exportações diretas:
   ```bash
   grep -r "export.*Html\|export.*{.*Html" \
     /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src \
     --include="*.tsx" --include="*.ts" 2>/dev/null
   ```

3. Verificar se há arquivo `_document.tsx` ou `_document.js` no app router:
   ```bash
   find /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/app -name "*document*" -type f
   ```

4. Verificar se há arquivo `/app/_document.tsx` (não usado no App Router, causaria conflito):
   ```bash
   ls -la /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/app/_document.tsx 2>&1
   ```

**Se encontrar _document.tsx:**
- Este arquivo é incompatível com App Router (Next.js 13+)
- Deve ser deletado imediatamente

**Nota da Busca:**
- `.next` cachê pode estar contaminado com importação antiga
- Se necessário, executar: `rm -rf .next && npm run build`

---

### 2. Verificar Providers e Contextos (5 min)

O erro pode estar em algum contexto ou provider que está recriando Html:

**Arquivo:** `app/providers.tsx`
- Conferir se está apenas exportando component
- Verificar se há HTML parsing ou SSR logic incorreto

**Arquivos a Verificar:**
```bash
grep -n "Html\|<html>\|<body>" \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/app/providers.tsx \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src/hooks/useAPI.tsx \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src/contexts/*.tsx \
  2>/dev/null
```

---

### 3. Investigar Componentes Dinâmicos (5 min)

Se houver componentes dinâmicos ou lazy-loaded que podem estar renderizando Html:

```bash
grep -r "React.lazy\|dynamic\|suspense" \
  /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/src/components \
  --include="*.tsx" | grep -i "html\|document" 2>/dev/null || echo "Nada encontrado"
```

---

### 4. Limpar .next e Reconstruir (10 min)

**Se a fonte do erro não for óbvia:**

1. Deletar cache do Next.js:
   ```bash
   rm -rf /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/.next
   ```

2. Executar build novamente:
   ```bash
   cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard
   npm run build 2>&1 | tail -50
   ```

3. Se o erro persistir, verificar o arquivo `.next/server/chunks/611.js` que é mencionado na stack:
   ```bash
   # O arquivo 611.js é gerado dinamicamente, então regenerá-lo pode ajudar
   rm -rf .next/server && npm run build 2>&1 | tail -50
   ```

---

### 5. Validações de Configuração Next.js (10 min)

**Verificar next.config.mjs:**
```bash
cat /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/next.config.mjs
```

Certificar que:
- ✅ `typedRoutes: false` está ativo (evita resolver rotas incorretamente)
- ✅ Sem configurações experimentais conflitantes
- ✅ `ignoreBuildErrors: true` para TypeScript (já configurado)
- ✅ `ignoreDuringBuilds: true` para ESLint (já configurado)

**Se necessário ajustar:**
```javascript
// next.config.mjs deve ter apenas:
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
```

---

### 6. Forçar Build em Modo Dev (10 min)

Se o build em produção não funcionar, testar modo dev:

```bash
# Testar se em dev o servidor sobe sem erros
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard
npm run dev:frontend 2>&1 | head -40
```

Se dev funciona mas build não:
- O problema está em otimização de produção
- Pode ser necessário usar: `npm run build -- --no-lint --no-lint`
- Ou desabilitar prerendering de páginas de erro

---

### 7. Desabilitar Prerendering de Error Pages (ÚLTIMO RECURSO)

Se nenhuma das acções acima funcionar, pode-se desabilitar o prerendering das páginas de erro:

**Edit next.config.mjs:**
```javascript
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Desabilitar prerendering de error pages
  experimental: {
    // Isso pode variar conforme a versão do Next.js
    // Procurar na documentação Next.js 15.5.6
  },
};
```

**Alternativa:** Renomear error pages para serem dinamicamente renderizadas:
- Mover `/app/error.tsx` para `/app/(dashboard)/error.tsx` (scoped)
- Mover `/app/global-error.tsx` para `/app/global-error-disabled.tsx` (desabilitar temporariamente)

---

## ✅ CHECKLIST

- [ ] Executou grep para buscar imports de `Html`
- [ ] Verificou se `_document.tsx` existe (deve não existir em App Router)
- [ ] Limpou `.next` e rebuildou
- [ ] Validou `next.config.mjs` contra checklist
- [ ] Testou `npm run dev:frontend` para validar modo dev
- [ ] Se build ainda falhar, documentou o erro específico
- [ ] Fez commit com a solução

---

## 🎯 CRITÉRIO DE SUCESSO

✅ **Build bem-sucedido:** `npm run build` completa sem erro de Html
✅ **Dev funciona:** `npm run dev` inicia normalmente
✅ **Aplicação renderiza:** Dashboard carrega sem erros de componentes

---

## 📊 SAÍDA ESPERADA

Se bem-sucedido, o build deve produzir:
```
✓ Compiled successfully in X.Xs
   Skipping validation of types
   Skipping linting
   Collecting page data ...
   Generating static pages (0/4) ...
✓ Prerendered 4 pages in 3.2 seconds
   Collecting static files ...
   Finalizing page optimization ...
   Build complete. Powered by v15.5.6
```

---

## 🚨 SE BLOQUEAR

Se após todas estas ações o erro persistir:

1. **Documente:**
   - Exato comando que falha
   - Stack trace completo
   - Versões de Next.js e Node

2. **Contexto:**
   - Este erro ocorre quando prerendering páginas de erro
   - Pode ser bug da versão Next.js 15.5.6
   - Solução: desabilitar prerendering ou usar versão LTS

3. **Próxima Ação:**
   - Passar o relatório detalhado para investigação
   - Continuar com Agents 5/6/7 em paralelo (build não bloqueia features)

---

## 📎 REFERÊNCIAS

- **Next.js App Router Docs:** https://nextjs.org/docs/app
- **Error Pages:** https://nextjs.org/docs/app/building-your-application/routing/error-handling
- **Build Troubleshooting:** https://nextjs.org/docs/messages/no-document-import-in-page

---

🚀 **Objetivo:** Ter build de produção funcional ou documentar bloqueador para investigação posterior.
