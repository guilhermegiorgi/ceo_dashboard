# PROMPT_AGENT_DOCUMENTATION_INTEGRATION_TESTING.md

## Mission
Finalize AI Provider Framework documentation and execute comprehensive integration tests to verify chat and insights workflows use selected providers correctly.

## Context
- All backend code done (router, config service, endpoints)
- Frontend integration done (UI, hooks, API client)
- Error handling & streaming implemented
- **Missing**: Documentation and end-to-end validation that everything works together

## Acceptance Criteria

### 1. Complete Documentation

#### 1.1 README Update
**File**: `docs/README.md`

Add section: "AI Provider Configuration"

```markdown
## AI Provider Configuration

The application supports multiple AI providers for different use cases:

### Supported Providers
- **OpenAI** - gpt-4, gpt-4-turbo, gpt-3.5-turbo
- **Anthropic** - claude-3-opus, claude-3-sonnet, claude-2
- **Google** - gemini-pro, palm-2
- **Perplexity** - pplx-7b, pplx-70b
- **Open Router** - Custom OpenAI-compatible providers

### Configuration
1. Navigate to Settings → AI Providers
2. Add API keys for each provider you want to use
3. Select default model for:
   - Chat conversations
   - Insights generation
   - Global operations
4. Test connection to verify API key validity

### Fallback Behavior
If primary provider fails:
1. System tries next available provider in priority order
2. If all fail, returns error with recovery suggestion
3. Check provider status and API key validity in Settings

### Streaming vs Standard
- Chat supports streaming responses (real-time token display)
- Insights uses standard response (faster generation)
- Both support provider fallback
```

#### 1.2 Architecture Document
**File**: `docs/AI_PROVIDER_ARCHITECTURE.md` (create new)

```markdown
# AI Provider Architecture

## Overview
[Diagram or description]

### Components

#### Backend
- **aiProviderRouter.js** - Routes requests to selected provider
- **aiConfigService.js** - Manages user config (API keys, model selection)
- **enhancedChatService.js** - Chat service using router
- **insightService.js** - Insights using router
- **/api/ai/config** - Config endpoints (get, update, test)

#### Frontend
- **AIProviderContext** - Global context for provider state
- **useAIProvider()** - Hook to access/update provider
- **useAPI()** - Enhanced with AI helper methods
- **SettingsModal** - UI for configuration
- **ChatWidget** - Displays active provider
- **FocusSummaryWidget** - Shows insights provider

### Data Flow

#### Setting Provider
1. User opens Settings
2. Selects provider and model
3. Clicks "Save" or "Test Connection"
4. POST /api/ai/config/update
5. Backend updates database
6. Frontend context updates
7. ChatWidget/FocusSummaryWidget re-render

#### Sending Chat Message
1. User types message in ChatWidget
2. Frontend gets current config from AIProviderContext
3. Calls POST /api/mcp/chat/stream with provider config
4. Backend routes to aiProviderRouter
5. Router validates provider/model/API key
6. Router calls provider API
7. If fails, tries fallback providers
8. Response streamed back to frontend
9. ChatWidget displays message with provider badge

#### Generating Insights
1. Dashboard triggers insight generation
2. Fetches current config from /api/ai/config
3. Calls POST /api/insights/generate with provider config
4. Backend routes through aiProviderRouter
5. Same fallback logic as chat
6. Result displayed in FocusSummaryWidget

## Error Handling
[Detailed error types and recovery]

## Testing
[Test strategy and coverage]
```

#### 1.3 API Documentation
**File**: `docs/API_AI_PROVIDER_ENDPOINTS.md` (create new)

```markdown
# AI Provider API Endpoints

## GET /api/ai/config
Get current user's AI provider configuration

**Response**:
\`\`\`json
{
  "apiKeys": {
    "openai": "sk-...",
    "anthropic": "sk-ant-..."
  },
  "modelSelection": {
    "chat": {"provider": "openai", "model": "gpt-4"},
    "insights": {"provider": "anthropic", "model": "claude-3-opus"},
    "global": {"provider": "openai", "model": "gpt-4"}
  },
  "fallbackProvider": "anthropic"
}
\`\`\`

## POST /api/ai/config/update
Update AI provider configuration

**Request**:
\`\`\`json
{
  "context": "chat",
  "provider": "openai",
  "model": "gpt-4",
  "apiKey": "sk-..." // optional
}
\`\`\`

## POST /api/ai/config/test/{provider}
Test connection to a provider

**Response**:
\`\`\`json
{
  "connected": true,
  "provider": "openai",
  "error": null
}
\`\`\`

## POST /api/mcp/chat/stream (with provider)
Send chat message with provider config

**Request**:
\`\`\`json
{
  "message": "Hello",
  "providerConfig": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "sk-..."
  }
}
\`\`\`

**Response**: SSE stream
```

### 2. Integration Tests

#### 2.1 Chat Workflow Test
**File**: `tests/e2e/ai-provider/chat-workflow.spec.ts`

Test scenarios:
- [ ] User opens chat with OpenAI configured
- [ ] Sends message
- [ ] Response arrives with OpenAI provider badge
- [ ] User switches to Anthropic in Settings
- [ ] Sends new message
- [ ] Response uses Anthropic model
- [ ] User tries with invalid API key
- [ ] Error shown with "Fix in Settings" prompt
- [ ] User provides correct key
- [ ] Message succeeds

**Test code structure**:
```typescript
describe('Chat with AI Provider Switching', () => {
  it('should send message with selected provider', async () => {
    // Setup: login, open chat
    // Execute: send message with openai selected
    // Verify: response received, provider badge shows openai
  })

  it('should fallback to secondary provider if primary fails', async () => {
    // Setup: primary provider with bad key, secondary valid
    // Execute: send message
    // Verify: uses secondary provider, no error
  })

  it('should show error if all providers fail', async () => {
    // Setup: all providers with bad keys
    // Execute: send message
    // Verify: error displayed, "Fix in Settings" link shown
  })
})
```

#### 2.2 Insights Workflow Test
**File**: `tests/e2e/ai-provider/insights-workflow.spec.ts`

Test scenarios:
- [ ] Dashboard loads, shows current insights provider
- [ ] User switches insights provider in Settings
- [ ] Dashboard header updates to show new provider
- [ ] User clicks "Regenerate Insights"
- [ ] New insights generated with selected provider
- [ ] Icon/badge shows which provider was used

#### 2.3 Settings Configuration Test
**File**: `tests/e2e/ai-provider/settings-configuration.spec.ts`

Test scenarios:
- [ ] User opens Settings → AI Providers
- [ ] Adds new API key
- [ ] Test Connection button validates key
- [ ] Shows ✅ Connected or ❌ Failed
- [ ] User selects different models for chat/insights/global
- [ ] Changes persist on page reload
- [ ] Active model displayed in ChatWidget and DashboardHeader

#### 2.4 Fallback Mechanism Test
**File**: `tests/e2e/ai-provider/fallback-mechanism.spec.ts`

Test scenarios:
- [ ] Primary provider fails
- [ ] Secondary provider attempts automatically
- [ ] Response received from secondary
- [ ] User never sees "Provider error" (transparent fallback)
- [ ] System logs which provider was used
- [ ] If all fail, clear error message displayed

### 3. Performance Testing

**File**: `tests/performance/ai-provider-latency.spec.ts`

Measure:
- [ ] Time to validate provider config
- [ ] Time to route to provider API
- [ ] Streaming latency (time to first token)
- [ ] Provider fallback overhead (time added by fallback attempt)

Target: <500ms for config validation, <2s for first token

### 4. Unit Test Coverage

Backend tests (if not already done):
- [ ] `aiProviderRouter.js` - 80%+ coverage
  - Valid requests
  - Invalid configs
  - Fallback scenarios
  - Error types
- [ ] `aiConfigService.js` - 80%+ coverage
  - Get/update config
  - API key encryption
  - Validation

Frontend tests (if not already done):
- [ ] `useAIProvider()` hook - context switching
- [ ] `AIProviderContext` - broadcast to subscribers
- [ ] `apiClient.js` - AI helper methods work

## QA Checklist

### Functional
- [ ] User can add API keys for multiple providers
- [ ] User can select different models per context
- [ ] Chat message sent with correct provider
- [ ] Insights generated with correct provider
- [ ] Provider switched mid-conversation works
- [ ] Fallback triggers and succeeds
- [ ] Error messages helpful
- [ ] Settings persist on reload

### UI/UX
- [ ] ChatWidget shows active provider clearly
- [ ] DashboardHeader shows insights provider
- [ ] Settings form is intuitive
- [ ] Test Connection feedback is clear
- [ ] Error messages are not technical jargon
- [ ] Mobile layout works

### Performance
- [ ] Provider selection doesn't slow down chat
- [ ] Config updates don't cause latency
- [ ] Fallback <500ms overhead
- [ ] No memory leaks with context switching

### Security
- [ ] API keys not logged in console
- [ ] API keys not sent in URLs
- [ ] API keys encrypted in database
- [ ] User can see (masked) keys they added

## Documentation Checklist

- [ ] README.md updated with provider info
- [ ] API_AI_PROVIDER_ENDPOINTS.md created and complete
- [ ] AI_PROVIDER_ARCHITECTURE.md created with diagrams
- [ ] Code comments on complex fallback logic
- [ ] Error codes documented
- [ ] Environment variables documented (if any)

## Known Limitations & Future Work

Document any limitations:
- [ ] Streaming only for chat, not insights
- [ ] Some providers have rate limits
- [ ] Model switching requires provider API key
- [ ] Fallback only between configured providers

## Effort Estimate
**50-60 minutes** (docs + E2E tests + performance checks)

## Related Files
- `docs/README.md`
- `docs/AI_PROVIDER_ARCHITECTURE.md` (create)
- `docs/API_AI_PROVIDER_ENDPOINTS.md` (create)
- `tests/e2e/ai-provider/` (multiple specs)
- `tests/performance/` (latency tests)
- All backend/frontend files (for validation)

## Success Criteria

After completion:
- [ ] All docs are current and accurate
- [ ] E2E tests pass 100%
- [ ] Performance meets targets
- [ ] No console errors in happy path
- [ ] User can switch providers and everything works
- [ ] Fallback transparent to user (unless all fail)
