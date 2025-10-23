# PROMPT_AGENT_ERROR_HANDLING_STREAMING.md

## Mission
Implement robust error handling, fallback mechanisms, and optional streaming support in the AI Provider Router to ensure graceful degradation and real-time response handling.

## Context
- `aiProviderRouter.js` exists but needs error handling and fallback logic
- Backend chat endpoint uses `aiProviderRouter` to route requests
- No streaming support yet (responses are full, not streamed)
- Need fallback to another provider if primary fails
- Need comprehensive error recovery

## Acceptance Criteria

### 1. Enhanced `aiProviderRouter.js`

Implement these capabilities:

```typescript
class AIProviderRouter {
  // Existing method - now with error handling
  async routeRequest(provider, model, prompt, config): Promise<Response> {
    try {
      // Try primary provider
      return await this.callProvider(provider, model, prompt, config)
    } catch (error) {
      // Implement fallback logic (see below)
      return await this.handleProviderFailure(provider, error, model, prompt, config)
    }
  }

  // New method - handle provider failure with fallback
  private async handleProviderFailure(
    originalProvider,
    error,
    model,
    prompt,
    config
  ): Promise<Response> {
    // Logic here (see below)
  }

  // New method - streaming support
  async routeStreamingRequest(
    provider,
    model,
    prompt,
    config,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    // Streaming logic here
  }

  // Validate provider/model/API key before making request
  private validateRequest(provider, model, apiKey): {valid: boolean, error?: string}

  // Log errors for debugging
  private logError(provider, error, context): void
}
```

### 2. Fallback Mechanism

**Behavior**:
1. Try primary provider → if fails:
2. Try next in fallback list → if fails:
3. Try global fallback provider → if fails:
4. Return meaningful error to client

**Implementation**:
```typescript
async handleProviderFailure(originalProvider, error, model, prompt, config) {
  // Determine if error is recoverable
  const isRecoverable = this.isRecoverableError(error)

  if (!isRecoverable) {
    // Fatal error (invalid API key, model not found, etc.)
    throw new ProviderError(error.message, 'FATAL', originalProvider)
  }

  // Try fallback providers in order
  const fallbackList = this.getFallbackProviders(originalProvider, config)

  for (const fallbackProvider of fallbackList) {
    try {
      return await this.callProvider(fallbackProvider, model, prompt, config)
    } catch (fallbackError) {
      // Log and continue to next
      this.logError(fallbackProvider, fallbackError, {attempt: 'fallback'})
    }
  }

  // All failed
  throw new ProviderError(
    'All providers failed. Check API keys and connection.',
    'ALL_FAILED',
    originalProvider,
    {fallbackAttempts: fallbackList.length}
  )
}

// Determine if error is worth retrying on fallback
private isRecoverableError(error): boolean {
  // Recoverable: rate limit, timeout, temporary server error
  // Not recoverable: invalid API key, model not found, auth error
  return error.statusCode >= 500 || error.statusCode === 429 || error.code === 'TIMEOUT'
}

// Get list of providers to try as fallback
private getFallbackProviders(originalProvider, config): AIProvider[] {
  // Remove original, return in priority order
  const all = ['openai', 'anthropic', 'google', 'perplexity', 'openrouter']
  const remaining = all.filter(p => p !== originalProvider)

  // Prioritize: providers with API keys set
  const withKeys = remaining.filter(p => config.apiKeys[p])

  // Return with global fallback last
  return [...withKeys, config.fallbackProvider].filter(Boolean)
}
```

### 3. Streaming Support

Add to `server/routes/chat.js`:

```typescript
// New endpoint: /api/mcp/chat/stream-v2 (or enhance existing)
router.post('/stream', async (req, res) => {
  const { message, providerConfig } = req.body

  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Call router with streaming handler
    await aiProviderRouter.routeStreamingRequest(
      providerConfig.provider,
      providerConfig.model,
      message,
      providerConfig,
      (chunk) => {
        res.write(`data: ${JSON.stringify({type: 'content', chunk})}\n\n`)
      }
    )

    res.write(`data: ${JSON.stringify({type: 'done'})}\n\n`)
    res.end()
  } catch (error) {
    res.write(`data: ${JSON.stringify({type: 'error', message: error.message})}\n\n`)
    res.end()
  }
})
```

### 4. Error Types & Recovery

Create `server/services/errors.js`:

```typescript
class ProviderError extends Error {
  constructor(message, code, provider, metadata = {}) {
    super(message)
    this.code = code // 'TIMEOUT', 'INVALID_KEY', 'RATE_LIMIT', 'FATAL', 'ALL_FAILED'
    this.provider = provider
    this.metadata = metadata
    this.recoverable = this.calculateRecoverability()
  }

  calculateRecoverability() {
    return !['INVALID_KEY', 'AUTH_FAILED', 'MODEL_NOT_FOUND'].includes(this.code)
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      provider: this.provider,
      recoverable: this.recoverable
    }
  }
}
```

### 5. Validation Before Request

```typescript
private validateRequest(provider, model, apiKey): {valid: boolean, error?: string} {
  if (!provider || !model) {
    return {valid: false, error: 'Provider and model required'}
  }

  if (!apiKey) {
    return {valid: false, error: `No API key for ${provider}`}
  }

  // Check model exists for provider
  const models = MODEL_REGISTRY[provider] || []
  if (!models.find(m => m.id === model)) {
    return {valid: false, error: `Model ${model} not available for ${provider}`}
  }

  return {valid: true}
}
```

### 6. Logging & Monitoring

Add debug logging:

```typescript
private logError(provider, error, context) {
  console.error(`[AIProviderRouter] ${provider} error:`, {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    context,
    timestamp: new Date().toISOString()
  })
}
```

## Unit Tests Required

**File**: `server/services/__tests__/aiProviderRouter.test.js`

Test cases:
- [ ] Successful request to primary provider
- [ ] Fallback triggered on provider failure
- [ ] All fallback attempts exhausted
- [ ] Streaming request returns chunks correctly
- [ ] Validation catches invalid config
- [ ] Error messages are meaningful
- [ ] Recoverable vs non-recoverable errors handled correctly

## Integration Tests

- [ ] Chat endpoint with provider fallback
- [ ] Insights generation with provider fallback
- [ ] Streaming response received correctly in frontend
- [ ] Error from all providers shown to user

## Implementation Notes

- **Don't timeout excessively**: Set reasonable timeout (30s for chat, 60s for insights)
- **Log everything**: Include provider, model, error code in logs for debugging
- **User-friendly errors**: "Provider unavailable, trying backup..." vs technical errors
- **Avoid retry loops**: Don't retry same provider immediately
- **Performance**: Fallback adds latency; consider caching successful providers

## Effort Estimate
**45-60 minutes** (error handling + streaming + tests)

## Related Files
- `server/services/aiProviderRouter.js`
- `server/routes/chat.js`
- `server/services/errors.js` (create new)
- `server/services/__tests__/aiProviderRouter.test.js` (create new)
- `server/services/enhancedChatService.js` (may need updates)
