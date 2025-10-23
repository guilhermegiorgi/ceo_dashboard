# 🔧 Troubleshooting: Avatar e Dados do Usuário Não Carregam

## ❓ Problema
Avatar, nome e email não aparecem no header após fazer login com Google.

---

## 🔍 Diagnóstico Rápido

### **Passo 1: Abrir Console do Navegador**
1. Pressione `F12` ou `Ctrl+Shift+I`
2. Vá para a aba **Console**
3. Procure por mensagens com `[useAuth]`

---

### **Passo 2: Verificar Logs**

#### ✅ **Cenário OK** (tudo funcionando):
```
🔑 [useAuth] Token exists: true
🚀 [useAuth] Fetching user data...
✅ [useAuth] User data received: { id: "...", email: "...", name: "...", picture: "..." }
```

#### ❌ **Problema 1: Sem Token**
```
🔑 [useAuth] Token exists: false
⚠️ [useAuth] No token found in localStorage
```

**Solução**: Você precisa fazer login!
1. Acesse: `http://localhost:3000/login`
2. Clique em "Login com Google"
3. Autorize o acesso
4. Será redirecionado para o dashboard

---

#### ❌ **Problema 2: Token Inválido/Expirado**
```
🔑 [useAuth] Token exists: true
🚀 [useAuth] Fetching user data...
❌ [useAuth] Error fetching user: Token malformado/expirado
```

**Solução**: Fazer logout e login novamente:
1. Abra o Console (F12)
2. Execute:
   ```javascript
   localStorage.clear();
   window.location.href = '/login';
   ```
3. Faça login novamente

---

#### ❌ **Problema 3: Coluna 'picture' Não Existe**
```
❌ [useAuth] Error: column "picture" does not exist
```

**Solução**: Adicionar coluna ao banco:
```bash
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT;')
  .then(() => console.log('✅ Column added'))
  .catch(err => console.error('❌ Error:', err))
  .finally(() => pool.end());
"
```

---

## 🧪 Página de Debug

Abra esta página no navegador para testar manualmente:
```
http://localhost:3000/debug-auth.html
```

**Ou** abra o arquivo:
```
file:///home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard/debug-auth.html
```

### Botões disponíveis:
1. **Check Token** - Verifica se token existe no localStorage
2. **Test /api/auth/me** - Testa o endpoint de autenticação
3. **Check User** - Verifica dados do usuário armazenados
4. **Clear All** - Limpa tudo e redireciona para login

---

## 📋 Checklist de Verificação

Execute os comandos no Console do navegador (F12):

### 1️⃣ **Verificar Token**
```javascript
localStorage.getItem('token')
```
- ✅ Deve retornar uma string longa (JWT)
- ❌ Se retornar `null` → **precisa fazer login**

### 2️⃣ **Verificar Refresh Token**
```javascript
localStorage.getItem('refreshToken')
```
- ✅ Deve retornar uma string longa
- ❌ Se retornar `null` → **precisa fazer login**

### 3️⃣ **Testar API Diretamente**
```javascript
fetch('http://localhost:3002/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log('Resposta:', data))
```

**Resposta esperada**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "seu@email.com",
    "name": "Seu Nome",
    "picture": "https://lh3.googleusercontent.com/...",
    "role": "admin"
  }
}
```

---

## 🔄 Solução Definitiva: Logout + Login

Se nada funcionar, force um logout completo:

```javascript
// Execute no Console do navegador (F12)
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
window.location.href = '/login';
```

---

## 🚀 Fluxo Correto de Login

1. **Acesse**: `http://localhost:3000/login`
2. **Clique**: "Login com Google"
3. **Autorize**: Permissões do Google
4. **Callback**: Redirecionado para `/auth/callback`
5. **Tokens Salvos**: Console mostra:
   ```
   ✅ Tokens saved successfully
   ✅ User data fetched: { ... }
   ✅ Redirecting to dashboard
   ```
6. **Dashboard**: Dados aparecem no header

---

## 🔍 Verificar Backend

### Testar se backend está rodando:
```bash
curl http://localhost:3002/health
```

**Resposta esperada**: `{"status":"ok"}`

### Testar endpoint de auth:
```bash
# Substitua SEU_TOKEN pelo token real
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:3002/api/auth/me
```

---

## 🆘 Ainda Não Funciona?

### Informações para Debug:

1. **Qual mensagem aparece no console?**
   - Copie e cole todas as mensagens `[useAuth]`

2. **O que retorna este comando?**
   ```javascript
   localStorage.getItem('token') ? 'Token existe' : 'Sem token'
   ```

3. **Backend está rodando?**
   ```bash
   lsof -ti:3002
   ```
   - Deve retornar um número (PID do processo)

4. **Teste direto da API:**
   ```bash
   curl http://localhost:3002/api/auth/me
   ```
   - Cole o resultado

---

## ✅ Solução Final

**Se você nunca fez login:**
1. Acesse `http://localhost:3000/login`
2. Clique em "Login com Google"
3. Autorize
4. Aguarde redirecionamento

**Se você já fez login mas não aparece:**
1. Abra Console (F12)
2. Execute: `localStorage.clear()`
3. Acesse `http://localhost:3000/login`
4. Faça login novamente

**Após login bem-sucedido:**
- Avatar do Google aparecerá
- Nome e email serão exibidos
- Console mostrará: `✅ [useAuth] User data received: {...}`

---

## 📞 Comandos Úteis

```bash
# Ver logs do backend em tempo real
cd /home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO/ceo_dashboard
npm run dev | grep -E "auth|user|token"

# Limpar cache do Next.js
rm -rf .next

# Reiniciar tudo
pkill -f "node|next"
npm run dev
```

---

**Última atualização**: Agora com logs detalhados em `[useAuth]` no console! 🎉
