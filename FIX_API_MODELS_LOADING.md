# Correção: Carregamento de Modelos da API

## Problema Resolvido
- ❌ Modelos estavam vindo hardcoded ao invés da API
- ❌ Campo de API key para "custom" provider estava faltando
- ❌ Provider não era criado automaticamente ao salvar API key

## Correções Aplicadas

### 1. Campo de API Key para Custom Provider
**Arquivo**: `src/components/settings/AIApiKeysSection.tsx`
- ✅ Adicionado campo "Custom" na lista de providers

### 2. Auto-Criação de Provider
**Arquivo**: `server/routes/aiConfig.js`
- ✅ Backend agora detecta quando usuário tem API key mas não tem provider
- ✅ Cria o provider automaticamente no banco de dados
- ✅ Logs detalhados do processo de criação e sync

**Como funciona**:
```
Usuário salva API key → Backend detecta → Cria provider no DB 
→ Chama syncProviderModels() → Busca modelos da API do provedor
→ Salva modelos no banco → Frontend recebe modelos reais
```

### 3. Força Reload de Modelos Após Salvar
**Arquivo**: `src/components/SettingsModalRefactored.tsx`
- ✅ Limpa cache de modelos ao salvar settings
- ✅ Recarrega modelos de TODOS os provedores com API keys
- ✅ Logs detalhados no console do browser

**Fluxo**:
```
Salvar Settings → Limpar cache → Para cada provider com API key:
  → Chamar /api/ai/config/models?provider=X
  → Armazenar modelos reais no cache
  → Atualizar UI
```

### 4. Tipos e Metadata Atualizados
**Arquivos**:
- `src/components/settings/types.ts` - Type AIProvider inclui "custom"
- `src/components/SettingsModalRefactored.tsx` - Metadata do custom provider
- `server/services/aiConfigService.js` - SUPPORTED_PROVIDERS inclui "custom"

## Como Testar

### 1. Reinicie o Servidor
```bash
# Encerre e reinicie
npm run dev
```

### 2. Abra DevTools Console
Pressione F12 e vá na aba Console

### 3. Adicione/Atualize uma API Key

**Exemplo com OpenAI**:
1. Vá em Settings > AI Providers
2. Cole sua API key do OpenAI (sk-...)
3. Clique em "Save Settings"

### 4. Observe os Logs

**Console do Browser** deve mostrar:
```
[Settings] Reloading models after saving API keys...
[Settings] Forcing model reload for openai...
[Settings] ✅ Loaded XX models for openai from API
```

**Logs do Servidor** devem mostrar:
```
[AIConfigRoute] Auto-creating provider openai for user <user-id>
[AIConfigRoute] Provider openai created with ID <provider-id>
[AIConfigRoute] Syncing models for provider openai (ID: <provider-id>)
[AIConfigRoute] Synced XX models for openai
```

### 5. Verifique os Modelos

1. Selecione um contexto (Chat, Insights, Global)
2. Abra o dropdown de "Provedor"
3. Selecione o provedor (ex: OpenAI)
4. Abra o dropdown de "Modelo"

**Deve aparecer**:
- ✅ Lista completa de modelos da API
- ✅ Informações reais: context window, custo, capabilities
- ✅ NÃO deve ter aviso amarelo de "Modelos padrão"

## Provedores com Carregamento Dinâmico

Estes provedores buscam modelos da API automaticamente:

### ✅ OpenAI
- Endpoint: GET /v1/models
- Fetcher: `fetchOpenAIModels`
- Exemplo: gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.

### ✅ Anthropic  
- Endpoint: (lista hardcoded mas atualizada)
- Fetcher: `fetchAnthropicModels`
- Exemplo: claude-3-5-sonnet-20241022, claude-3-opus, etc.

### ✅ OpenRouter
- Endpoint: GET /api/v1/models
- Fetcher: `fetchOpenRouterModels`
- Exemplo: Centenas de modelos de múltiplos provedores

### ✅ DeepSeek
- Endpoint: GET /v1/models
- Fetcher: `fetchDeepSeekModels`
- Exemplo: deepseek-chat, deepseek-coder, etc.

### ⚠️ Google Gemini
- Fetcher: **NÃO IMPLEMENTADO**
- Usa: MODEL_REGISTRY hardcoded (mas atualizado)
- Modelos: gemini-2.0-flash-exp, gemini-1.5-pro, etc.

### ⚠️ Perplexity
- Fetcher: **NÃO IMPLEMENTADO**
- Usa: MODEL_REGISTRY hardcoded (mas atualizado)
- Modelos: sonar-reasoning, sonar-pro, etc.

### ⚙️ Custom
- Fetcher: **Depende da configuração**
- Você deve configurar manualmente

## Troubleshooting

### Problema: Ainda aparecem modelos hardcoded

**Causa**: Provider não foi criado automaticamente

**Solução**:
1. Verifique logs do servidor para ver se houve erro na criação
2. Tente clicar em "Atualizar modelos" no card do contexto
3. Ou chame manualmente:
   ```bash
   POST /api/ai-providers/:providerId/models/sync
   ```

### Problema: "Failed to sync models"

**Causas possíveis**:
1. API key inválida
2. Provider não tem fetcher implementado (Google, Perplexity)
3. Erro de rede/timeout

**Solução**:
1. Verifique que a API key está correta
2. Para Google/Perplexity: é esperado, use modelos hardcoded
3. Cheque logs do servidor para mais detalhes

### Problema: Custom provider sem modelos

**Causa**: Custom providers precisam configuração manual

**Solução**:
1. Você precisa adicionar modelos manualmente no banco
2. Ou configurar como "openai-compatible" e usar endpoint de modelos

## Arquivos Modificados

### Frontend (3 arquivos)
1. ✅ `src/components/settings/AIApiKeysSection.tsx`
2. ✅ `src/components/settings/types.ts`
3. ✅ `src/components/SettingsModalRefactored.tsx`

### Backend (2 arquivos)
1. ✅ `server/routes/aiConfig.js`
2. ✅ `server/services/aiConfigService.js`

## Próximos Passos (Futuro)

- [ ] Implementar fetcher para Google Gemini
- [ ] Implementar fetcher para Perplexity  
- [ ] Auto-refresh de modelos a cada X horas
- [ ] UI para configurar custom providers
- [ ] Validação de API keys antes de salvar

---

**Teste agora e verifique os logs!** 🚀

Se ainda aparecerem modelos hardcoded, me envie:
1. Logs do console do browser
2. Logs do servidor
3. Qual provider você está testando
