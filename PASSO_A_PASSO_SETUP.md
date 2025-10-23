# 🚀 PASSO A PASSO: Setup com Dados Reais

**Status:** Vamos fazer AGORA, juntos!

---

## ✅ ETAPA 1: Google OAuth (5 minutos)

### Abra estas duas abas no navegador:

**Aba 1:** https://console.cloud.google.com/apis/credentials
**Aba 2:** Este terminal (para copiar/colar)

### Passos no Google Cloud Console:

1. **Criar/Selecionar Projeto**
   - Se não tiver projeto: clique "NEW PROJECT"
   - Nome: `CEO Dashboard`
   - Clique "CREATE"

2. **Configure OAuth Consent Screen** (primeira vez)
   - Menu: "OAuth consent screen"
   - User Type: **External**
   - Clique "CREATE"
   
   **App information:**
   - App name: `CEO Dashboard`
   - User support email: SEU_EMAIL@gmail.com
   - Developer contact: SEU_EMAIL@gmail.com
   - Clique "SAVE AND CONTINUE"
   
   **Scopes:**
   - Clique "ADD OR REMOVE SCOPES"
   - Selecione:
     ☑ `.../auth/userinfo.email`
     ☑ `.../auth/userinfo.profile`
   - Clique "UPDATE"
   - Clique "SAVE AND CONTINUE"
   
   **Test users:**
   - Clique "+ ADD USERS"
   - Adicione: SEU_EMAIL@gmail.com
   - Clique "ADD"
   - Clique "SAVE AND CONTINUE"

3. **Criar OAuth Client ID**
   - Volte para "Credentials"
   - Clique "+ CREATE CREDENTIALS"
   - Selecione "OAuth client ID"
   
   **Configure:**
   - Application type: **Web application**
   - Name: `CEO Dashboard Local`
   
   **Authorized JavaScript origins:**
   - Clique "+ ADD URI"
   - Cole: `http://localhost:3000`
   
   **Authorized redirect URIs:**
   - Clique "+ ADD URI"
   - Cole: `http://localhost:3002/api/auth/google/callback`
   
   - Clique "CREATE"

4. **COPIE as credenciais que aparecerem:**
   ```
   Client ID: algo-como-123456.apps.googleusercontent.com
   Client secret: algo-como-GOCSPX-abc123xyz
   ```

---

## ⚠️ PAUSE AQUI - Me envie as credenciais

Quando você tiver o Client ID e Client Secret, me envie e eu configuro no .env

OU faça você mesmo:

```bash
nano .env

# Procure estas linhas e substitua:
GOOGLE_CLIENT_ID=SEU-CLIENT-ID-AQUI
GOOGLE_CLIENT_SECRET=SEU-CLIENT-SECRET-AQUI

# Salve: Ctrl+O, Enter, Ctrl+X
```

---

Depois que configurar, me avise para continuarmos!
