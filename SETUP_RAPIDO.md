# 🚀 Setup Rápido - Google OAuth + Dados Reais

**Tempo estimado:** 10 minutos

---

## ✅ Situação Atual

**BOA NOTÍCIA:** Passport já está instalado e configurado! ✅

Precisamos apenas:
1. Configurar credenciais do Google (5 min)
2. Limpar dados mock (1 min)
3. Reiniciar sistema (1 min)

---

## 📋 Passo 1: Google Cloud Console (5 min)

### Criar Credenciais OAuth

**Acesse:** https://console.cloud.google.com/apis/credentials

1. **Criar projeto** > Nome: `CEO Dashboard`

2. **Configure OAuth Consent Screen:**
   - User Type: **External**
   - App name: `CEO Dashboard`
   - User support email: seu email
   - Scopes: `userinfo.email` e `userinfo.profile`
   - Test users: adicione seu email

3. **Criar OAuth Client ID:**
   - Type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3002/api/auth/google/callback`

4. **Copie:** Client ID e Client Secret

5. **Atualize .env:**
```bash
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
```

---

## 🧹 Passo 2: Limpar Dados Mock

```bash
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard

# Ver o que será removido
node scripts/clear-mock-data.js --dry-run

# Remover
node scripts/clear-mock-data.js
```

---

## 🔄 Passo 3: Reiniciar

```bash
pkill -f "node.*server"
sleep 2
npm run dev
```

---

## 🎯 Passo 4: Testar

Acesse: http://localhost:3000
Clique em "Login com Google"

✅ Pronto!
