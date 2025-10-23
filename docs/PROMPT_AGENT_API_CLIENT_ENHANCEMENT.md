# PROMPT_AGENT_API_CLIENT_ENHANCEMENT.md

## Mission
Enhance the API client (`src/services/apiClient.ts`) and `useAPI` hook to expose AI provider configuration and provide helper methods for provider-aware requests.

## Context
- Backend has `/api/ai/config/*` endpoints working (get, update, test)
- Frontend components need convenient methods to interact with provider config
- Current `useAPI` hook is generic; needs AI-specific helpers
- Frontend hooks need to fetch and manage AI provider state

## Acceptance Criteria

### 1. Enhanced `apiClient.ts`

Add these methods to the main export:

```typescript
// Get current AI provider configuration for user
getAIConfig(): Promise<AIProviderConfig>

// Update AI provider selection for a specific context
updateAIConfig(context: 'chat' | 'insights' | 'global', config: Partial<AIProviderConfig>): Promise<{success: boolean, config: AIProviderConfig}>

// Test connection to a specific provider
testAIProvider(provider: AIProvider, apiKey?: string): Promise<{connected: boolean, error?: string}>

// Get list of available models for a provider
getProviderModels(provider: AIProvider): Promise<ModelInfo[]>

// Send chat message with provider override (optional)
sendChatMessage(message: string, providerOverride?: {provider: AIProvider, model: string}): Promise<Response>
```

### 2. Enhanced `useAPI` Hook
**File**: `src/hooks/useAPI.tsx`

Add AI-specific methods:

```typescript
const {
  // Existing methods...
  get, post, put, delete,

  // New AI-specific methods
  getAIConfig,
  updateAIConfig,
  testAIProvider,
  getProviderModels,
  sendChatWithProvider,

  // Status
  loading,
  error
} = useAPI()
```

Each method should:
- Handle loading/error states
- Log requests/responses (for debugging)
- Retry on transient failures
- Throw or return error in consistent format

### 3. Type Definitions
**File**: `src/components/settings/types.ts` (enhance)

Ensure these types are exported and properly typed:

```typescript
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'perplexity' | 'openrouter'
export type ModelContext = 'chat' | 'insights' | 'global'

export interface ModelInfo {
  id: string
  name: string
  provider: AIProvider
  contextWindow: number
  costPer1kTokens: {input: number, output: number}
  trainingDataCutoff?: string
  capabilities?: string[]
}

export interface AIProviderConfig {
  apiKeys: {[key in AIProvider]?: string}
  modelSelection: {
    chat: {provider: AIProvider, model: string}
    insights: {provider: AIProvider, model: string}
    global: {provider: AIProvider, model: string}
  }
  customProviders?: Record<string, CustomProviderConfig>
  fallbackProvider: AIProvider
}

export interface CustomProviderConfig {
  name: string
  baseUrl: string
  headers?: Record<string, string>
  modelFormat?: 'openai-compatible' | 'custom'
}
```

### 4. Integration with useChat Hook
**File**: `src/hooks/useChat.tsx`

Enhance to use AI provider config:

```typescript
const useChat = () => {
  const { getAIConfig, sendChatWithProvider } = useAPI()
  const aiProvider = useAIProvider()

  const sendMessage = async (message: string) => {
    const config = await getAIConfig()
    const chatModel = config.modelSelection.chat

    return sendChatWithProvider(message, {
      provider: chatModel.provider,
      model: chatModel.model
    })
  }

  return { sendMessage, ... }
}
```

### 5. Error Handling
- All new methods should handle:
  - Network errors (timeout, no connection)
  - API errors (invalid provider, bad API key)
  - Invalid model selection
  - Config not found
- Return consistent error format: `{ success: false, error: "message", code: "ERROR_CODE" }`

### 6. Caching Strategy
- Cache `getAIConfig()` result for 5 minutes
- Invalidate cache when `updateAIConfig()` is called
- Clear cache on logout

## Implementation Notes

- **Backward compatible**: Don't break existing useAPI usage
- **Type-safe**: All methods should be fully typed
- **Error messages**: Should be user-friendly for display in UI
- **Logging**: Add debug logs for API calls (console.log in dev mode)

## Testing Checklist

- [ ] `getAIConfig()` returns current config
- [ ] `updateAIConfig()` updates and returns new config
- [ ] `testAIProvider()` correctly identifies connection success/failure
- [ ] `getProviderModels()` returns models for given provider
- [ ] `sendChatWithProvider()` sends message and passes provider context
- [ ] Error handling works for all edge cases
- [ ] Cache invalidation works after config update
- [ ] Types compile without errors

## Effort Estimate
**30-40 minutes** (API methods + types + integration)

## Related Files
- `src/services/apiClient.ts`
- `src/hooks/useAPI.tsx`
- `src/hooks/useChat.tsx`
- `src/components/settings/types.ts`
- Backend: `/api/ai/config/*` endpoints (already done)
