# 🔐 Guia: Configurar Google OAuth para Login Local

**Objetivo:** Fazer login com sua conta Google no sistema rodando em localhost

**Tempo:** ~15 minutos

---

## 📋 Pré-requisitos

- ✅ Conta Google
- ✅ Acesso ao Google Cloud Console
- ✅ Backend rodando em `localhost:3002`
- ✅ Frontend rodando em `localhost:3000`

---

## 🚀 Passo a Passo

### Etapa 1: Google Cloud Console

1. **Acesse:** https://console.cloud.google.com/

2. **Crie um projeto** (se não tiver)
   - Clique em "Select a project" no topo
   - Clique em "NEW PROJECT"
   - Nome: `CEO Dashboard Local`
   - Clique em "CREATE"

3. **Ative a API do Google+**
   - No menu lateral: APIs & Services > Library
   - Busque: "Google+ API"
   - Clique em "ENABLE"

### Etapa 2: Criar Credenciais OAuth

1. **Vá para Credentials**
   - Menu lateral: APIs & Services > Credentials
   - Clique em "+ CREATE CREDENTIALS"
   - Selecione "OAuth client ID"

2. **Configure OAuth Consent Screen** (se pedido)
   - Clique em "CONFIGURE CONSENT SCREEN"
   - User Type: **External** (pode usar com qualquer Google)
   - Clique em "CREATE"
   
   **Na tela de configuração:**
   - App name: `CEO Dashboard`
   - User support email: `seu-email@gmail.com`
   - Developer contact: `seu-email@gmail.com`
   - Clique em "SAVE AND CONTINUE"
   
   **Scopes:** (próxima tela)
   - Clique em "ADD OR REMOVE SCOPES"
   - Selecione:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Clique em "UPDATE"
   - Clique em "SAVE AND CONTINUE"
   
   **Test users:** (próxima tela)
   - Clique em "+ ADD USERS"
   - Adicione seu email: `seu-email@gmail.com`
   - Clique em "ADD"
   - Clique em "SAVE AND CONTINUE"

3. **Criar OAuth Client ID**
   - Application type: **Web application**
   - Name: `CEO Dashboard Local`
   
   **Authorized JavaScript origins:**
   - Clique em "+ ADD URI"
   - Adicione: `http://localhost:3000`
   
   **Authorized redirect URIs:**
   - Clique em "+ ADD URI"
   - Adicione: `http://localhost:3002/api/auth/google/callback`
   
   - Clique em "CREATE"

4. **Copie as credenciais**
   - Uma modal aparecerá com:
     - **Client ID**: algo como `123456789-abc...apps.googleusercontent.com`
     - **Client Secret**: algo como `GOCSPX-abc123...`
   - **Copie ambos** (vamos usar no próximo passo)

### Etapa 3: Configurar no Sistema

1. **Abra o arquivo `.env`**
   ```bash
   cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard
   nano .env  # ou use seu editor preferido
   ```

2. **Atualize as variáveis do Google OAuth**
   
   Procure estas linhas:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:3002/api/auth/google/callback
   ```
   
   Substitua com seus valores:
   ```env
   GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abc123...
   GOOGLE_CALLBACK_URL=http://localhost:3002/api/auth/google/callback
   ```

3. **Salve o arquivo**
   - Ctrl+O (salvar)
   - Ctrl+X (sair)

### Etapa 4: Instalar Dependências do Passport

```bash
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard

# Instalar passport e estratégia do Google
npm install passport passport-google-oauth20 express-session
```

### Etapa 5: Criar Configuração do Passport

Crie o arquivo `server/config/passport.js`:

```bash
mkdir -p server/config
cat > server/config/passport.js << 'EOF'
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from '../database/pg-pool.js';

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        
        // Check if user exists
        let result = await query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        
        if (result.rows.length > 0) {
          // User exists, return it
          return done(null, result.rows[0]);
        }
        
        // User doesn't exist, create new one
        // First, get or create tenant for this user
        const tenantResult = await query(
          `INSERT INTO tenants (name, slug, plan, status)
           VALUES ($1, $2, 'free', 'active')
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [name, email.split('@')[0]]
        );
        
        const tenantId = tenantResult.rows[0].id;
        
        // Create user
        result = await query(
          `INSERT INTO users (tenant_id, email, name, role, status, auth_provider)
           VALUES ($1, $2, $3, 'user', 'active', 'google')
           RETURNING *`,
          [tenantId, email, name]
        );
        
        done(null, result.rows[0]);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
EOF
```

### Etapa 6: Atualizar server/index.js

Adicione o passport no início do arquivo:

```javascript
// No início do arquivo, depois dos imports existentes
import session from 'express-session';
import passport from './config/passport.js';

// Depois de criar o app Express (const app = express();)
// Adicione antes das rotas:

// Session configuration (necessário para passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
```

### Etapa 7: Reiniciar Backend

```bash
# Parar o backend atual
pkill -f "node.*server"

# Aguardar 2 segundos
sleep 2

# Reiniciar
npm run dev:backend
```

### Etapa 8: Testar

1. **Acesse:** http://localhost:3000

2. **Clique em "Login" ou "Login com Google"**

3. **Será redirecionado para Google**
   - Escolha sua conta
   - Autorize o app
   - Será redirecionado de volta

4. **Você deve estar logado!**
   - Verá seu nome/email
   - Terá acesso ao dashboard

---

## ✅ Verificação

### Como saber se funcionou:

1. **Backend logs devem mostrar:**
   ```
   Google OAuth callback successful
   ```

2. **Você verá seu email real** no dashboard (não dev@ggai.dev)

3. **Ao acessar /api/auth/me**, deve retornar seus dados:
   ```bash
   curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:3002/api/auth/me
   ```

---

## 🐛 Troubleshooting

### Erro: "redirect_uri_mismatch"

**Problema:** URI de callback não autorizada

**Solução:**
1. Volte no Google Cloud Console
2. Credentials > seu OAuth Client
3. Verifique "Authorized redirect URIs"
4. Deve estar exatamente: `http://localhost:3002/api/auth/google/callback`

### Erro: "Access blocked: This app's request is invalid"

**Problema:** App não verificado

**Solução:**
1. No Google Cloud Console > OAuth consent screen
2. Em "Publishing status", clique em "PUBLISH APP"
3. Ou adicione seu email em "Test users"

### Erro: "passport is not defined"

**Problema:** Dependências não instaladas

**Solução:**
```bash
npm install passport passport-google-oauth20 express-session
```

### Backend não inicia após mudanças

**Problema:** Erro de sintaxe ou import

**Solução:**
```bash
# Verificar logs
tail -50 logs/server.log

# Verificar sintaxe
node --check server/index.js
```

---

## 🎯 Próximos Passos

Depois que o Google OAuth funcionar:

1. **Limpar dados mock:**
   ```bash
   node scripts/clear-mock-data.js --dry-run  # Ver o que será removido
   node scripts/clear-mock-data.js            # Remover dados
   ```

2. **Desabilitar dev login** (opcional):
   - Comentar a rota `/dev-login` em `server/routes/auth.js`

3. **Adicionar botão "Login com Google"** no frontend:
   - Criar link para: `http://localhost:3002/api/auth/google`

---

## 📞 Precisa de Ajuda?

Se algo não funcionar:

1. Verifique os logs: `tail -f logs/server.log`
2. Teste a URL manualmente: http://localhost:3002/api/auth/google
3. Verifique o `.env` está correto
4. Certifique-se que as dependências foram instaladas

---

**Pronto!** Após seguir este guia, você poderá fazer login com sua conta Google real e ver suas informações no dashboard. 🎉
