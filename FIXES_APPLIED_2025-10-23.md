# Correções Aplicadas - 23/10/2025

## Problema 1: Loop Infinito no EventSource
**Sintoma**: Console mostrando erro 401 repetidamente para `/api/brain/events`

**Causa**: Hook `useBrainCloudEvents` tentava conectar sem verificar se havia token de autenticação.

**Correção**: 
- `src/hooks/useBrainCloudEvents.ts`
  - Adicionado guard para verificar token antes de conectar
  - Desabilitado auto-reconnect quando não há token disponível

## Problema 2: Token OAuth Armazenado com Nome Errado
**Sintoma**: Login com Google funcionava, mas depois todas as requisições falhavam com 401

**Causa**: `AuthCallbackPage` armazenava como `"accessToken"`, mas o resto do código esperava `"token"`

**Correção**:
- `src/views/AuthCallbackPage.tsx`
  - Mudado de `localStorage.setItem("accessToken", ...)` para `localStorage.setItem("token", ...)`
  - Corrigido endpoint de `/api/user/me` para `/api/auth/me`
  - Adicionado logs para facilitar debug

## Problema 3: Loop Infinito no DashboardDataContext
**Sintoma**: Requisições para `/api/dashboard/today` sendo feitas infinitamente

**Causa**: `useEffect` tinha `loadSnapshot` e `getDashboardCollections` nas dependências, causando re-execuções infinitas

**Correção**:
- `src/contexts/DashboardDataContext.tsx`
  - Mudado useEffect para ter array de dependências vazio `[]`
  - Adicionado `eslint-disable` comment explicativo

## Problema 4: Autenticação Instável (JWT vs Passport Session)
**Sintoma**: Algumas requisições passavam, outras falhavam com 401 aleatoriamente

**Causa**: Middleware `authenticateJWT` verificava sessão do Passport ANTES do JWT token, causando confusão quando ambos existiam

**Correção**:
- `server/middleware/auth.js`
  - Invertida ordem de verificação: JWT token PRIMEIRO, Passport session como fallback
  - Removidos logs verbosos de debug
  - Melhorada lógica de fallback entre JWT e OAuth session
  - Logs mais limpos e informativos

## Problema 5: Settings Não Salvavam por Causa de 401
**Sintoma**: Ao salvar configurações, erro 401 causava falha total

**Correção**:
- `src/components/settings/hooks/useSettingsPersistence.ts`
  - Settings agora salvam no localStorage primeiro (sempre funciona)
  - Sincronização com servidor é tentada, mas falha não bloqueia a operação
  - Erro 401 não é mais tratado como falha crítica
  - Usuário é informado quando salvo apenas localmente

- `src/components/SettingsModalRefactored.tsx`
  - Mensagem diferenciada: "Configurações salvas localmente (faça login para sincronizar)"

## Testando as Correções

1. **Login com Google**:
   ```bash
   # Limpe o localStorage primeiro
   localStorage.clear()
   
   # Faça login via Google
   # Verifique que o token está correto:
   localStorage.getItem("token")  // Deve retornar o JWT token
   ```

2. **Verificar Autenticação**:
   - Abra DevTools > Network
   - Verifique que requisições incluem header `Authorization: Bearer <token>`
   - Logs do servidor devem mostrar `✅ JWT autenticado: seu@email.com`

3. **Verificar Settings**:
   - Vá em Settings > Save
   - Deve salvar sem erros
   - Se não autenticado, mostra aviso mas salva localmente

4. **EventSource**:
   - Não deve mais tentar conectar infinitamente
   - Se não autenticado, mostra warning no console e para

## Como Funcionam Agora

### Fluxo de Autenticação
```
Requisição → Middleware authenticateJWT
    ↓
    ├─ Tem JWT token no Authorization header?
    │  ├─ Sim → Valida JWT
    │  │         ├─ Válido → ✅ Autenticado (passa req.user)
    │  │         └─ Inválido → Tenta Passport session ↓
    │  └─ Não → Tenta Passport session ↓
    ↓
    ├─ Tem sessão Passport (OAuth)?
    │  ├─ Sim → ✅ Autenticado (usa req.user do Passport)
    │  └─ Não → ❌ 401 Não autorizado
```

### OAuth Login Flow
```
1. Usuário clica "Login com Google"
2. Redireciona para /api/auth/google
3. Google callback → servidor cria sessão Passport + gera JWT tokens
4. Redireciona para /auth/callback?accessToken=...&refreshToken=...
5. AuthCallbackPage:
   - Armazena token como "token" (não "accessToken")
   - Busca dados do usuário em /api/auth/me
   - Redireciona para dashboard
6. Todas as requisições agora usam JWT token
```

## Próximos Passos

Se ainda houver problemas:

1. **Verifique os logs do servidor**:
   ```
   ✅ JWT autenticado: email@example.com
   OU
   ✅ Passport session autenticada: email@example.com
   ```

2. **Verifique localStorage**:
   ```javascript
   console.log({
     token: localStorage.getItem("token"),
     refreshToken: localStorage.getItem("refreshToken"),
     user: localStorage.getItem("user")
   });
   ```

3. **Network tab**:
   - Requisições devem ter header `Authorization: Bearer ...`
   - Respostas não devem retornar 401

## Arquivos Modificados

- ✅ `src/hooks/useBrainCloudEvents.ts`
- ✅ `src/views/AuthCallbackPage.tsx`
- ✅ `src/contexts/DashboardDataContext.tsx`
- ✅ `server/middleware/auth.js`
- ✅ `src/components/settings/hooks/useSettingsPersistence.ts`
- ✅ `src/components/SettingsModalRefactored.tsx`
