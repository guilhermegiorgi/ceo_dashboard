# 🎯 Qual .env Usar? (RESPOSTA CLARA)

## ✅ RESPOSTA DIRETA

**Use o `.env` na RAIZ do projeto:**

```
/home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/.env
```

**NÃO use:** Nenhum `.env` dentro de `src/`

---

## 📂 Por quê?

### Como funciona no Next.js + Node.js:

```
ceo_dashboard/
├── .env              ← ✅ ESTE AQUI (único correto)
├── package.json
├── next.config.mjs
├── server/
│   └── index.js      ← Lê o .env da raiz
├── app/              ← Next.js lê o .env da raiz
└── src/
    └── components/   ← NÃO precisa de .env aqui
```

### Regra do Next.js:

- ✅ `.env` na **raiz do projeto** (onde está `package.json`)
- ❌ `.env` em subpastas NÃO funciona

---

## 🔍 Verificação

### Confirme que está usando o correto:

```bash
# 1. Vá para a raiz do projeto
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard

# 2. Verifique que o .env existe aqui
ls -la .env

# 3. Edite ESTE arquivo
nano .env
# ou
code .env
```

---

## ⚠️ Se você tem .env no src/

**Pode deletar!** Ele não é usado.

```bash
# Verificar se existe
ls -la src/.env 2>/dev/null

# Se existir e quiser remover:
rm src/.env
```

---

## 📝 Como editar o .env correto

### Opção 1: Nano (Terminal)
```bash
nano .env

# Navegue com setas
# Edite as linhas
# Salve: Ctrl+O, Enter
# Saia: Ctrl+X
```

### Opção 2: VSCode
```bash
code .env
```

### Opção 3: Qualquer editor
```bash
# Caminho completo:
/home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/.env
```

---

## ✅ Checklist

- [ ] Abri o `.env` da RAIZ do projeto
- [ ] Encontrei as linhas `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
- [ ] Estou editando o arquivo correto
- [ ] NÃO estou editando nenhum arquivo dentro de `src/`

---

## 🎯 RESUMO

**Arquivo correto:**
```
.env          ← na raiz, ao lado de package.json
```

**Linhas a editar:**
```env
GOOGLE_CLIENT_ID=COLE-SEU-CLIENT-ID-AQUI
GOOGLE_CLIENT_SECRET=COLE-SEU-CLIENT-SECRET-AQUI
```

**Após editar:**
```bash
# Reiniciar para pegar as mudanças
npm run dev
```

---

✅ **Pronto!** Use o `.env` da raiz e está tudo certo.
