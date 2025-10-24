# Informações sobre Modelos de IA

## Status de Carregamento de Modelos

### Provedores com Carregamento Dinâmico (via API)
Estes provedores buscam a lista de modelos disponíveis diretamente da API do provedor:

- ✅ **OpenAI** - Lista completa de modelos via API
- ✅ **Anthropic** - Lista completa de modelos via API  
- ✅ **OpenRouter** - Lista completa de modelos via API
- ✅ **DeepSeek** - Lista completa de modelos via API

### Provedores com Modelos Hardcoded (Fallback)
Estes provedores usam uma lista pré-definida porque não têm implementação de fetcher:

- ⚠️ **Google (Gemini)** - Modelos hardcoded:
  - gemini-2.0-flash-exp
  - gemini-1.5-pro
  - gemini-1.5-flash
  - gemini-1.5-flash-8b
  - gemini-1.0-pro

- ⚠️ **Perplexity** - Modelos hardcoded:
  - sonar-reasoning
  - sonar
  - sonar-pro
  - sonar-medium-online
  - sonar-small-chat

- ⚙️ **Custom** - Sem modelos pré-definidos (você deve configurar manualmente)

## Como Funciona o Carregamento

### 1. Provedores com API Key Cadastrada + Fetcher Implementado
```
Usuário adiciona API key → Provider criado no banco 
→ Primeiro acesso: syncProviderModels() busca modelos via API
→ Modelos salvos no banco de dados
→ Frontend recebe lista real e atualizada
```

### 2. Provedores com API Key mas Sem Fetcher
```
Usuário adiciona API key → Provider criado no banco
→ Não há fetcher para buscar modelos
→ Backend retorna MODEL_REGISTRY (hardcoded)
→ Frontend mostra aviso: "Modelos padrão"
```

### 3. Provedores Sem API Key
```
Usuário seleciona provider sem API key
→ Provider não existe no banco
→ Backend retorna MODEL_REGISTRY (hardcoded)
→ Frontend mostra aviso: "Adicione API key para modelos dinâmicos"
```

## Modelos Hardcoded Atualizados (2025-10-23)

### OpenAI
- gpt-4o
- gpt-4o-mini
- gpt-4-turbo
- gpt-4-turbo-preview
- gpt-4
- gpt-4-vision-preview
- gpt-3.5-turbo
- gpt-3.5-turbo-16k

### Anthropic
- claude-3-5-sonnet-20241022 (mais recente)
- claude-3-5-sonnet-20240620
- claude-3-opus-20240229
- claude-3-sonnet-20240229
- claude-3-haiku-20240307

### Google Gemini
- gemini-2.0-flash-exp (experimental)
- gemini-1.5-pro
- gemini-1.5-flash
- gemini-1.5-flash-8b
- gemini-1.0-pro

### Perplexity
- sonar-reasoning (novo)
- sonar
- sonar-pro
- sonar-medium-online
- sonar-small-chat

### OpenRouter
- openrouter/auto (roteamento automático)
- anthropic/claude-3.5-sonnet:beta
- meta-llama/llama-3.1-70b-instruct
- google/gemini-flash-1.5
- openai/gpt-4o

### Custom
- Array vazio - você deve configurar seus próprios modelos

## Para Desenvolvedores

### Como Adicionar Fetcher para Novo Provedor

1. **Criar função fetcher** em `server/services/aiProviderService.js`:
```javascript
async function fetchGoogleModels({ apiKey, baseUrl }) {
  // Implemente busca de modelos via API do Google
  // Retorne array de objetos com: modelId, displayName, etc.
}
```

2. **Registrar no MODEL_FETCHERS**:
```javascript
const MODEL_FETCHERS = {
  openai: fetchOpenAIModels,
  anthropic: fetchAnthropicModels,
  google: fetchGoogleModels, // <-- adicionar aqui
  // ...
};
```

3. **Testar sync**:
```bash
POST /api/ai-providers/:id/models/sync
```

### Como Atualizar MODEL_REGISTRY

Edite `server/services/aiConfigService.js`:
```javascript
export const MODEL_REGISTRY = {
  providerName: [
    "model-id-1",
    "model-id-2",
    // ...
  ],
};
```

## Troubleshooting

### Problema: Modelos desatualizados
**Solução**: Clique em "Atualizar modelos" no Settings ou chame:
```bash
POST /api/ai-providers/:providerId/models/sync
```

### Problema: Provedor não aparece na lista
**Solução**: 
1. Verifique se está em `ALL_PROVIDERS` no frontend
2. Verifique se está em `SUPPORTED_PROVIDERS` no backend
3. Verifique se tem metadata em `PROVIDER_METADATA`

### Problema: Custom provider não funciona
**Solução**: Custom providers precisam de configuração manual de:
- Base URL
- Headers de autenticação
- Formato de API (openai-compatible ou custom)

## Melhorias Futuras

- [ ] Implementar fetcher para Google Gemini
- [ ] Implementar fetcher para Perplexity
- [ ] Cache de modelos com TTL configurável
- [ ] Auto-sync periódico de modelos
- [ ] Suporte a modelos custom via UI
- [ ] Validação de modelos antes de selecionar
