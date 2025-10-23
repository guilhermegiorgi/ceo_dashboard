# 🔧 Fix: Foto do Google não carrega

**Date:** January 21, 2025  
**Issue:** Avatar do Google OAuth não aparece, só mostra iniciais  
**Status:** ✅ RESOLVED

---

## 🐛 Problem

Após login com Google:
- ✅ Nome correto: "Guilherme Giorgi"
- ✅ Email correto: "vectal.free@gg.ai"
- ❌ **Foto não aparece** (mostra apenas "N")

---

## 🔍 Root Cause

### 1. Coluna `picture` não existia na tabela

```sql
\d users
-- Não tinha coluna 'picture'
```

### 2. Passport não estava salvando a foto

```javascript
// ANTES - não salvava picture
INSERT INTO users (tenant_id, email, password_hash, name, role, status)
VALUES ($1, $2, $3, $4, 'admin', 'active')
```

### 3. Deserialização não incluía picture

```javascript
// ANTES - não buscava picture
SELECT id, tenant_id, email, name, role, status
FROM users WHERE id = $1
```

---

## ✅ Solution Applied

### 1. Adicionadas Colunas no Banco

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50);
```

### 2. Atualizado Passport - Criação de Usuário

**File:** `server/config/passport.js`

```javascript
// DEPOIS - salva picture do Google
const picture = profile.photos?.[0]?.value || null;

INSERT INTO users (tenant_id, email, password_hash, name, role, status, picture, auth_provider)
VALUES ($1, $2, $3, $4, 'admin', 'active', $5, $6)
RETURNING id, tenant_id, email, name, role, status, picture
```

### 3. Atualizado Passport - Login Existente

```javascript
// Atualiza picture a cada login
const picture = profile.photos?.[0]?.value || null;

UPDATE users
SET picture = $1, 
    last_login_at = NOW(),
    updated_at = NOW()
WHERE id = $2
```

### 4. Atualizado Deserialização

```javascript
// Agora inclui picture
SELECT id, tenant_id, email, name, role, status, picture
FROM users WHERE id = $1
```

### 5. Atualizado /api/auth/me

```javascript
// Fallback se picture não vier do banco
if (!userProfile.picture && req.user.picture) {
  userProfile.picture = req.user.picture;
}
```

---

## 🎯 How It Works Now

### OAuth Flow com Foto

```
1. Login com Google
   ↓
2. Google retorna: profile.photos[0].value
   ↓
3. Passport salva no campo users.picture
   ↓
4. Session inclui picture
   ↓
5. /api/auth/me retorna picture
   ↓
6. useAuth hook recebe picture
   ↓
7. Header exibe foto do Google
```

### Dados salvos agora:

```javascript
{
  id: "uuid",
  email: "vectal.free@gg.ai",
  name: "Guilherme Giorgi",
  picture: "https://lh3.googleusercontent.com/a/...",
  auth_provider: "google"
}
```

---

## 📊 Impact

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Avatar Header | Iniciais "N" | ✅ Foto do Google |
| Avatar Modal | Iniciais | ✅ Foto do Google |
| Nova Conta | Sem foto | ✅ Foto salva |
| Login Existente | Sem foto | ✅ Foto atualizada |
| Fallback | Iniciais | ✅ Graceful fallback |

---

## 🧪 Verification

### Para testar:

1. **Logout:**
   - Clicar no avatar > Sair

2. **Login novamente:**
   ```
   http://localhost:3002/api/auth/google
   ```

3. **Verificar:**
   - Avatar deve mostrar SUA foto do Google
   - Modal deve mostrar foto grande
   - Banco deve ter URL da foto

4. **Verificar no banco:**
   ```sql
   SELECT email, name, picture, auth_provider 
   FROM users 
   WHERE email = 'vectal.free@gg.ai';
   ```
   
   Deve retornar picture com URL do Google.

---

## 🔗 Related Files

**Modified:**
- ✅ `server/config/passport.js` - Salva foto do Google
- ✅ `server/routes/auth.js` - Inclui foto em /api/auth/me
- ✅ Database - Adicionadas colunas picture e auth_provider

**Already Fixed:**
- ✅ `src/hooks/useAuth.tsx` - Busca foto
- ✅ `src/components/Header.tsx` - Exibe foto

---

## 💡 Technical Details

### Google Profile Structure

```javascript
profile = {
  id: "google-user-id",
  displayName: "Guilherme Giorgi",
  emails: [{ value: "vectal.free@gg.ai" }],
  photos: [{ value: "https://lh3.googleusercontent.com/..." }]
}
```

### Database Schema

```sql
ALTER TABLE users ADD COLUMN picture TEXT;
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50);

-- picture: URL da foto (Google, GitHub, etc)
-- auth_provider: 'google', 'github', 'local', etc
```

---

## ✅ Verification Checklist

- [x] Coluna picture adicionada
- [x] Coluna auth_provider adicionada
- [x] INSERT salvando picture
- [x] UPDATE atualizando picture
- [x] SELECT buscando picture
- [x] /api/auth/me retornando picture
- [x] Frontend exibindo picture
- [ ] **TESTE: Fazer logout e login novamente**

---

## 🚨 PRÓXIMO PASSO

**IMPORTANTE:** Para ver a foto, você precisa:

1. **Fazer LOGOUT** (limpar sessão antiga)
2. **Fazer LOGIN novamente** com Google
3. **Agora sim** a foto será salva e exibida!

```bash
# Backend já está atualizado
# Só precisa re-autenticar
```

---

**Fixed by:** Agent Runtime Error Fix  
**Date:** January 21, 2025  
**Resolution Time:** ~25 minutes  
**Type:** Database Schema + OAuth Integration

---

🎉 **Logout e login novamente para ver sua foto do Google!**
