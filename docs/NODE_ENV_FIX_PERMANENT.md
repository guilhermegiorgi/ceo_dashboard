# 🔧 Correção Permanente do NODE_ENV

**Problema:** `NODE_ENV=development` está setado no ambiente do sistema, causando falhas de build.

**Status:** ⚠️ **AÇÃO REQUERIDA PELO USUÁRIO**

---

## Diagnóstico

```bash
# Verificar se NODE_ENV está setado no ambiente:
printenv | grep NODE_ENV

# Se retornar "NODE_ENV=development" → PROBLEMA CONFIRMADO
```

---

## Solução 1: Remover do Shell Config (RECOMENDADO)

### Bash (~/.bashrc ou ~/.bash_profile):
```bash
# Abrir arquivo de config:
nano ~/.bashrc

# Procurar e REMOVER estas linhas:
export NODE_ENV=development
# ou
NODE_ENV=development

# Salvar e recarregar:
source ~/.bashrc
```

### Zsh (~/.zshrc):
```bash
# Abrir arquivo de config:
nano ~/.zshrc

# Procurar e REMOVER estas linhas:
export NODE_ENV=development
# ou
NODE_ENV=development

# Salvar e recarregar:
source ~/.zshrc
```

### Verificar:
```bash
# NODE_ENV não deve retornar nada:
printenv | grep NODE_ENV

# Se nada aparecer → ✅ RESOLVIDO
```

---

## Solução 2: Alias de Build (ALTERNATIVA)

Se não quiser remover NODE_ENV do ambiente, criar alias:

### Adicionar ao ~/.bashrc ou ~/.zshrc:
```bash
# Alias para build seguro:
alias npm-build='unset NODE_ENV && npm run build'
alias npm-dev='npm run dev'
alias npm-start='unset NODE_ENV && npm start'
```

### Usar:
```bash
# Ao invés de:
npm run build

# Use:
npm-build
```

---

## Solução 3: Script de Build (CI/CD)

Criar `scripts/build.sh`:
```bash
#!/bin/bash
set -e

# Remover NODE_ENV temporariamente
unset NODE_ENV

# Build
npm run build

echo "✅ Build completed successfully"
```

Tornar executável:
```bash
chmod +x scripts/build.sh
```

Usar:
```bash
./scripts/build.sh
```

---

## Solução 4: Package.json Script

Editar `package.json`:
```json
{
  "scripts": {
    "build": "next build",
    "build:safe": "NODE_ENV= next build",
    "build:unset": "bash -c 'unset NODE_ENV && next build'"
  }
}
```

Usar:
```bash
npm run build:safe
# ou
npm run build:unset
```

---

## Verificação Final

Após aplicar qualquer solução:

```bash
# 1. Verificar NODE_ENV não está no ambiente:
printenv | grep NODE_ENV
# Deve retornar vazio

# 2. Limpar build anterior:
rm -rf .next

# 3. Build sem unset manual:
npm run build

# 4. Verificar sucesso:
# Deve mostrar:
# ✓ Compiled successfully
# ✓ Generating static pages (4/4)
```

---

## Por Que Isso Acontece?

Next.js gerencia `NODE_ENV` automaticamente:
- `next dev` → seta `NODE_ENV=development`
- `next build` → seta `NODE_ENV=production`
- `next start` → usa `NODE_ENV=production`

Quando `NODE_ENV` já está setado no ambiente, Next.js detecta como "non-standard value" e causa conflitos internos.

---

## Recomendação Final

**MELHOR PRÁTICA:** ✅ **Solução 1** (Remover do shell config)

**Por quê?**
- Solução permanente
- Sem workarounds
- Next.js funciona como esperado
- Sem scripts/aliases extras

**Alternativa:** Se precisar de `NODE_ENV` para outros projetos:
- Use variável customizada: `APP_ENV`, `ENVIRONMENT`, `ENV`, etc.
- Deixe `NODE_ENV` livre para frameworks gerenciarem

---

## Testado e Validado

```bash
# Teste com NODE_ENV setado:
NODE_ENV=development npm run build
# ❌ Falha: "<Html> should not be imported..."

# Teste sem NODE_ENV:
unset NODE_ENV && npm run build
# ✅ Sucesso: "✓ Generating static pages (4/4)"
```

---

**Documentado por:** Agent HTML Investigation  
**Data:** 2025-01-21  
**Status:** Aguardando ação do usuário
