# Google OAuth Setup Guide

## Visão Geral

Este guia explica como configurar a autenticação OAuth com Google para o CEO Dashboard, permitindo que usuários façam login com suas contas Google.

## Fluxo OAuth

```
[Usuário] → [Frontend: Botão "Login com Google"]
           ↓
[Backend: /api/auth/google] → [Google OAuth]
           ↓
[Google: Autorização do usuário]
           ↓
[Backend: /api/auth/google/callback]
           ↓
[Cria/Atualiza usuário no banco]
           ↓
[Frontend: /auth/callback] → Armazena tokens → [Dashboard]
```

## Pré-requisitos

- Conta Google (Google Account)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com/)

## Passo 1: Criar Projeto no Google Cloud Console

### 1.1 Acessar Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Faça login com sua conta Google
3. Clique em **"Select a project"** no topo da página
4. Clique em **"NEW PROJECT"**

### 1.2 Configurar o Projeto

1. **Project name**: `CEO Dashboard` (ou nome de sua escolha)
2. **Location**: Deixe como está ou escolha sua organização
3. Clique em **"CREATE"**
4. Aguarde a criação do projeto (pode levar alguns segundos)

## Passo 2: Configurar OAuth Consent Screen

### 2.1 Acessar OAuth Consent Screen

1. No menu lateral, vá em **APIs & Services** > **OAuth consent screen**
2. Selecione **External** (para permitir qualquer usuário com conta Google)
3. Clique em **CREATE**

### 2.2 Preencher Informações do App

**App information:**
- **App name**: `CEO Dashboard`
- **User support email**: Seu email
- **App logo**: (Opcional) Logo do seu app

**App domain:**
- **Application home page**: `http://localhost:5173` (desenvolvimento)
- **Application privacy policy link**: (Opcional)
- **Application terms of service link**: (Opcional)

**Authorized domains:**
- `localhost` (para desenvolvimento)
- Seu domínio de produção (ex: `seudominio.com`)

**Developer contact information:**
- Seu email

Clique em **SAVE AND CONTINUE**

### 2.3 Configurar Scopes

1. Clique em **ADD OR REMOVE SCOPES**
2. Selecione os seguintes scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
3. Clique em **UPDATE** e depois em **SAVE AND CONTINUE**

### 2.4 Test Users (apenas para External em modo testing)

Se você escolheu "External" e está em modo "Testing":
1. Clique em **ADD USERS**
2. Adicione os emails dos usuários que poderão testar
3. Clique em **SAVE AND CONTINUE**

### 2.5 Revisar e Publicar

1. Revise as configurações
2. Clique em **BACK TO DASHBOARD**

## Passo 3: Criar OAuth 2.0 Client ID

### 3.1 Acessar Credentials

1. No menu lateral, vá em **APIs & Services** > **Credentials**
2. Clique em **+ CREATE CREDENTIALS**
3. Selecione **OAuth client ID**

### 3.2 Configurar Client ID

1. **Application type**: Selecione **Web application**
2. **Name**: `CEO Dashboard Web Client`

**Authorized JavaScript origins:**
```
http://localhost:5173
http://localhost:3001
```

**Authorized redirect URIs:**
```
http://localhost:3001/api/auth/google/callback
```

3. Clique em **CREATE**

### 3.3 Salvar Credenciais

Uma modal aparecerá com suas credenciais:

- **Client ID**: `123456789-abc...apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-...`

⚠️ **IMPORTANTE**: Copie essas credenciais imediatamente! Você precisará delas.

## Passo 4: Configurar Variáveis de Ambiente

### 4.1 Atualizar `.env`

Edite o arquivo `.env` na raiz do projeto:

```env
# OAuth Authentication (Google)
GOOGLE_CLIENT_ID=seu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:5173
```

**Exemplo com valores reais:**
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-Abc123Def456Ghi789
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

### 4.2 Reiniciar o Servidor

Após configurar as variáveis, reinicie o servidor backend:

```bash
npm run dev:backend
```

## Passo 5: Testar OAuth

### 5.1 Acessar Login

1. Abra o navegador em `http://localhost:5173/login`
2. Você verá o botão **"Continuar com Google"**

### 5.2 Fluxo de Login

1. Clique em **"Continuar com Google"**
2. Você será redirecionado para o Google
3. Selecione sua conta Google
4. Autorize o acesso ao app
5. Você será redirecionado de volta para o dashboard

### 5.3 Verificar Banco de Dados

Após o login bem-sucedido, verifique que:

1. **Usuário criado** na tabela `users`
2. **Tenant criado** na tabela `tenants` (workspace pessoal)
3. **OAuth provider** salvo na tabela `oauth_providers`
4. **User settings** criado na tabela `user_settings`

```sql
-- Verificar usuário OAuth
SELECT u.email, u.name, t.name as tenant_name, o.provider
FROM users u
JOIN tenants t ON u.tenant_id = t.id
JOIN oauth_providers o ON o.user_id = u.id
WHERE o.provider = 'google';
```

## Configuração para Produção

### Passo 1: Atualizar Domínios

No Google Cloud Console:

1. **OAuth consent screen** > **Edit App**
2. Adicione seu domínio de produção em **Authorized domains**:
   - `seudominio.com`

### Passo 2: Atualizar Redirect URIs

1. **Credentials** > Seu OAuth Client > **Edit**
2. Adicione URLs de produção:

**Authorized JavaScript origins:**
```
https://seudominio.com
https://api.seudominio.com
```

**Authorized redirect URIs:**
```
https://api.seudominio.com/api/auth/google/callback
```

### Passo 3: Variáveis de Ambiente (Produção)

```env
NODE_ENV=production
GOOGLE_CLIENT_ID=seu-client-id-producao.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret-producao
GOOGLE_CALLBACK_URL=https://api.seudominio.com/api/auth/google/callback
FRONTEND_URL=https://seudominio.com
```

### Passo 4: Publicar o App

Se você quer que qualquer usuário Google possa fazer login (não apenas test users):

1. **OAuth consent screen** > **PUBLISH APP**
2. O Google pode solicitar verificação para apps que usam scopes sensíveis
3. Para scopes básicos (email, profile), geralmente não precisa verificação

## Troubleshooting

### Erro: "redirect_uri_mismatch"

**Problema**: A URL de callback não está autorizada.

**Solução**:
1. Verifique se o `GOOGLE_CALLBACK_URL` no `.env` está correto
2. Confira se essa URL está listada em **Authorized redirect URIs** no Google Console
3. URLs devem ser exatamente iguais (incluindo `http`/`https`, porta, path)

### Erro: "access_denied"

**Problema**: Usuário negou permissão ou não está em Test Users.

**Solução**:
1. Se o app está em modo Testing, adicione o email em **Test users**
2. Ou publique o app (PUBLISH APP)

### Erro: "invalid_client"

**Problema**: Client ID ou Client Secret inválidos.

**Solução**:
1. Verifique se copiou corretamente do Google Console
2. Não deve ter espaços ou quebras de linha
3. Reinicie o servidor após alterar `.env`

### Erro: "No email found in OAuth profile"

**Problema**: O Google não retornou o email do usuário.

**Solução**:
1. Verifique se o scope `userinfo.email` está configurado
2. Certifique-se de que o usuário autorizou acesso ao email

### Tokens não chegam no frontend

**Problema**: Callback não redireciona corretamente.

**Solução**:
1. Verifique se `FRONTEND_URL` está correto no `.env`
2. Confira se a rota `/auth/callback` existe no frontend
3. Verifique logs do navegador para erros CORS

## Arquitetura do Sistema

### Tabelas Relacionadas

```sql
-- Usuários (criados via OAuth ou tradicional)
users
├── id
├── tenant_id (FK)
├── email
├── name
└── password_hash (vazio para OAuth)

-- OAuth providers (múltiplos providers por usuário)
oauth_providers
├── id
├── user_id (FK)
├── provider ('google', 'github', etc)
├── provider_user_id
├── email
├── access_token (encrypted)
├── refresh_token (encrypted)
└── raw_profile (JSONB)
```

### Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/auth/google` | Inicia OAuth flow |
| GET | `/api/auth/google/callback` | Callback do Google |
| POST | `/api/auth/login` | Login tradicional (email/senha) |
| POST | `/api/auth/register` | Registro tradicional |
| POST | `/api/auth/refresh` | Refresh access token |

## Segurança

### Tokens Criptografados

Os tokens OAuth (access_token, refresh_token) são armazenados criptografados no banco usando AES-256-CBC:

```javascript
// server/config/passport.js
function encryptToken(token) {
  const algorithm = 'aes-256-cbc';
  const key = process.env.ENCRYPTION_KEY; // 32 caracteres
  // ... encryption logic
}
```

⚠️ **Configure `ENCRYPTION_KEY` no `.env` com 32 caracteres**:
```env
ENCRYPTION_KEY=sua-chave-de-32-caracteres-aqui
```

### JWT Tokens

Após autenticação OAuth bem-sucedida, o sistema gera:
- **Access Token**: JWT válido por 15 minutos
- **Refresh Token**: JWT válido por 7 dias

Configuráveis via `.env`:
```env
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Próximos Passos

- [ ] Adicionar OAuth com GitHub
- [ ] Adicionar OAuth com Microsoft
- [ ] Implementar 2FA (Two-Factor Authentication)
- [ ] Adicionar gerenciamento de sessões ativas
- [ ] Implementar revogação de tokens OAuth

## Referências

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
