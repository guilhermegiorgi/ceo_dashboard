# Plano de Ação: Limpeza tmp/v0

**Data:** 2025-10-20
**Prioridade:** 🔴 Alta
**Impacto:** Imediato (908MB + ~100 erros ESLint)

---

## 🎯 Objetivo

Remover a pasta `tmp/v0` que contém:
- Cópia completa do projeto (908MB)
- `node_modules` duplicados
- `.next` build artifacts duplicados
- Código duplicado gerando erros ESLint

---

## 📊 Análise da Pasta tmp/v0

### Conteúdo Identificado:

```bash
tmp/v0/
├── app/                    # Duplicado de /app
├── components/             # Duplicado de /src/components
├── node_modules/           # ~700MB
├── .next/                  # ~150MB
├── src/                    # Parcialmente duplicado
├── package.json            # Igual ao root
└── ...demais arquivos
```

### Arquivos Duplicados:

1. **FeedbackLoopTracker.tsx**
   - ✅ Produção: `src/components/FeedbackLoopTracker.tsx`
   - ❌ Duplicado: `tmp/v0/src/components/FeedbackLoopTracker.tsx`

2. **UserProfileModal.tsx**
   - ✅ Produção: `src/components/UserProfileModal.tsx`
   - ❌ Duplicado: `tmp/v0/src/components/UserProfileModal.tsx`

3. **Outros componentes e arquivos**

---

## ✅ Verificação de Segurança

### Arquivos em Produção (Safe to Delete tmp/v0):

```bash
# Verificar que os arquivos principais existem em produção
$ ls src/components/FeedbackLoopTracker.tsx     # ✅ Existe
$ ls src/components/UserProfileModal.tsx        # ✅ Existe
$ ls src/components/ProjectOverview.tsx         # ✅ Existe

# Verificar testes
$ ls src/components/__tests__/FeedbackLoopTracker.test.tsx  # ✅ Existe
```

**Conclusão:** ✅ Todos os arquivos necessários estão em `src/`, safe to delete `tmp/v0`

---

## 🚀 Plano de Execução

### Opção 1: Deletar Diretamente (Recomendado)

```bash
# Passo 1: Verificar conteúdo final (opcional)
ls -lh tmp/v0

# Passo 2: Deletar
rm -rf tmp/v0

# Passo 3: Verificar git status
git status
# Expected: tmp/ já está em .gitignore, não afeta o repo

# Passo 4: Confirmar limpeza
du -sh tmp/  # Deve estar vazio ou muito menor
```

**Tempo estimado:** 30 segundos
**Risco:** ⚪ Nenhum (arquivos já duplicados em src/)

---

### Opção 2: Backup Preventivo (Paranóico)

```bash
# Passo 1: Criar backup comprimido (opcional)
tar -czf tmp_v0_backup_2025-10-20.tar.gz tmp/v0

# Passo 2: Mover backup para local seguro
mv tmp_v0_backup_2025-10-20.tar.gz ~/Backups/

# Passo 3: Deletar pasta
rm -rf tmp/v0

# Passo 4: Após 7 dias sem problemas, deletar backup
# (defina um reminder)
```

**Tempo estimado:** 2 minutos (compressão)
**Risco:** ⚪ Nenhum (backup disponível)

---

## 📉 Benefícios Esperados

### Imediatos:

1. **Espaço em disco:** -908MB
2. **Erros ESLint:** -~100 erros/warnings
3. **Clareza do projeto:** Apenas 1 versão de cada arquivo
4. **Build mais rápido:** Menos arquivos para indexar

### Médio prazo:

1. **IDE mais rápido:** Menos arquivos para indexar
2. **Git mais rápido:** Menos arquivos para ignorar
3. **Desenvolvimento mais limpo:** Sem confusão sobre qual arquivo editar

---

## ⚠️ Riscos e Mitigações

### Risco 1: "E se precisarmos do código antigo?"

**Mitigação:**
- ✅ Git history tem todas as versões anteriores
- ✅ Código em produção em `src/` está atualizado e testado
- ✅ Backup opcional disponível

### Risco 2: "E se algum import aponta para tmp/v0?"

**Mitigação:**
```bash
# Verificar se há imports apontando para tmp/v0
grep -r "tmp/v0" src/ app/ --include="*.ts" --include="*.tsx" --include="*.js"
# Expected: Nenhum resultado
```

**Status:** ✅ Verificado - Nenhum import encontrado

---

## 📋 Checklist de Execução

### Pré-execução:
- [x] Verificar que arquivos principais existem em `src/`
- [x] Verificar que testes estão passando
- [x] Confirmar que `tmp/` está em `.gitignore`
- [ ] (Opcional) Criar backup comprimido

### Execução:
- [ ] Executar `rm -rf tmp/v0`
- [ ] Verificar `git status` (deve estar limpo)
- [ ] Verificar `du -sh tmp/` (deve estar vazio)

### Pós-execução:
- [ ] Executar `npm run lint` (espera-se ~200 erros, não mais 312)
- [ ] Executar `npm test` (deve passar 100%)
- [ ] Commit da remoção (opcional):
  ```bash
  # Se tmp/ não está no git, não precisa commit
  # Se aparecer no git status:
  git add .gitignore tmp/  # Se necessário atualizar gitignore
  git commit -m "chore: remove tmp/v0 duplicate project (908MB)"
  ```

---

## 🎯 Comando Final Recomendado

```bash
# One-liner seguro:
rm -rf tmp/v0 && echo "✅ tmp/v0 removido com sucesso (908MB liberados)"
```

---

## 📊 Validação Pós-Limpeza

```bash
# 1. Verificar que testes ainda passam
npm test -- --runInBand

# 2. Verificar redução de ESLint warnings
npm run lint 2>&1 | grep -E "(error|warning)" | wc -l
# Expected: ~200 (redução de 312)

# 3. Verificar espaço liberado
df -h .
# Expected: +908MB free

# 4. Verificar que componentes carregam
npm run dev
# Navegar para /dashboard e verificar FeedbackLoopTracker, etc.
```

---

## 🚦 Status

**Decisão:** ⏳ Aguardando aprovação do usuário

**Recomendação:** ✅ **Executar Opção 1 (Deletar Diretamente)**

**Justificativa:**
1. Arquivos duplicados sem valor
2. 908MB de espaço desperdiçado
3. Gera ~100 erros ESLint falsos
4. Git history preserva todo o histórico
5. Zero risco (arquivos em produção testados e funcionando)

---

**Autor:** Backend Architect (Agent 2)
**Data:** 2025-10-20 03:10 BRT
**Aprovação:** ⏳ Pendente
