# QA Checklist - AI Provider Framework

Comprehensive validation checklist for the AI Provider Framework implementation.

## Functional Testing

### Settings Modal - AI Model Selection

- [ ] **Settings modal opens** from dashboard via settings button
- [ ] **AI Model Selection section visible** with proper heading
- [ ] **Current Active Models display** shows:
  - [ ] Chat provider and model name
  - [ ] Insights provider and model name
  - [ ] Global operations provider and model name
  - [ ] Loading state while fetching current config
  - [ ] "Last updated: X minutes ago" timestamp

### Provider Selection

- [ ] **Provider dropdown populates** with only providers that have API keys configured
- [ ] **No API key providers** display helpful message: "Add API key first"
- [ ] **Provider selection disabled** for providers without API keys
- [ ] **Provider badges display** correctly (colors, icons, names)
  - [ ] OpenAI displays with orange badge
  - [ ] Anthropic displays with blue badge
  - [ ] Google displays with appropriate color
  - [ ] Perplexity displays with appropriate color
  - [ ] OpenRouter displays with appropriate color

### Model Loading (CRITICAL - Dynamic Models)

- [ ] **Models fetch dynamically** from `getProviderModels(provider)` API
- [ ] **NO hardcoded model names** anywhere in code
- [ ] **Loading spinner shows** while fetching models: "Loading models..."
- [ ] **Model dropdown populates** with:
  - [ ] Model ID
  - [ ] Model display name
  - [ ] Context window size
  - [ ] Training data cutoff date (if available)
- [ ] **Model dropdown updates** when provider selection changes
- [ ] **Model format** displays as: "[model-name] - [context-window]k tokens"
- [ ] **Graceful error handling** if model fetch fails
  - [ ] Error message: "Failed to load models, please try again"
  - [ ] Fallback to cached models if available
  - [ ] Retry button visible

### Model Information Display

- [ ] **Model info displays** when model is selected:
  - [ ] Context window size (e.g., "128,000 tokens")
  - [ ] Training data cutoff date
  - [ ] Cost per 1k tokens (input/output)
  - [ ] Capabilities badges:
    - [ ] "Streaming"
    - [ ] "Vision"
    - [ ] "Function-calling"
    - [ ] Others per provider
- [ ] **Model capabilities** reflect actual provider capabilities (no stale data)

### Test Connection

- [ ] **Test Connection button** present for each provider selection
- [ ] **Button disabled** if no API key configured
- [ ] **Button click triggers** connection test to `/api/ai/config/test/{provider}`
- [ ] **Loading state shows** during test (spinner + "Testing...")
- [ ] **Success response** displays:
  - [ ] ✅ "Connected" or "✓ Success"
  - [ ] Response time in milliseconds
  - [ ] Provider name and model tested
- [ ] **Failure response** displays:
  - [ ] ❌ "Failed" or "✗ Error"
  - [ ] Error code: INVALID_KEY, TIMEOUT, RATE_LIMIT, etc.
  - [ ] User-friendly error message
  - [ ] Suggestion to check Settings
- [ ] **Connection test does NOT timeout** (completes within 30 seconds)

### Fallback Provider Configuration

- [ ] **Fallback section visible** in settings
- [ ] **Fallback provider dropdown** shows available providers
- [ ] **Fallback provider selection** persists on save
- [ ] **Fallback provider different** from primary options are enforced
- [ ] **Test Fallback Connection** button works
- [ ] **Clear explanation** of fallback behavior displayed

### Model Caching & Refresh

- [ ] **"Refresh Models" button** visible in Current Active Models section
- [ ] **Cache info displays** as: "Last updated: 5 minutes ago"
- [ ] **Cache age updates** correctly (1 min, 5 mins, 30 mins, etc.)
- [ ] **Refresh button click**:
  - [ ] Shows loading state: "Refreshing..."
  - [ ] Clears all cached models
  - [ ] Refetches models from API for all providers
  - [ ] Shows notification: "Model list updated"
  - [ ] Updates timestamp to "just now"
- [ ] **Cache expires** after 60 minutes (user sees expired status)
- [ ] **Automatic refresh** on Settings open if cache is stale

### Configuration Persistence

- [ ] **Unsaved indicator appears** when any setting changes
  - [ ] Text: "[•] You have unsaved changes"
  - [ ] Visual styling clear
  - [ ] Updates instantly on change
- [ ] **Save button disabled** until changes made
- [ ] **Save button click**:
  - [ ] Shows loading spinner
  - [ ] Calls PATCH `/api/ai/config` with correct payload
  - [ ] Shows success message: "AI models updated successfully"
  - [ ] Disables unsaved indicator
  - [ ] Updates global AIProviderContext
- [ ] **Cancel button**:
  - [ ] Reverts to last saved state
  - [ ] Hides unsaved indicator
  - [ ] Does NOT call API
- [ ] **Configuration persists** on page reload
  - [ ] localStorage updated
  - [ ] Backend persisted in database
  - [ ] Browser restart shows saved config

### Per-Context Settings

- [ ] **Chat Context Section**:
  - [ ] Provider dropdown + Model dropdown
  - [ ] Model info display
  - [ ] Test Connection button
  - [ ] Shows currently active model
- [ ] **Insights Context Section**:
  - [ ] Provider dropdown + Model dropdown
  - [ ] Model info display
  - [ ] Test Connection button
  - [ ] Shows currently active model
- [ ] **Global Context Section**:
  - [ ] Provider dropdown + Model dropdown
  - [ ] Model info display
  - [ ] Test Connection button
  - [ ] Shows currently active model
- [ ] **Independent selections** for each context
- [ ] **Can use different providers** for each context

---

## Integration Testing

### Chat Widget Integration

- [ ] **Provider badge displays** above chat input
  - [ ] Format: "Using [Provider] - [Model]"
  - [ ] Updates in real-time when settings change
  - [ ] Shows provider icon if available
- [ ] **Chat message sends** with selected provider config
- [ ] **Streaming responses** show tokens in real-time
- [ ] **Provider badge on response** shows which provider generated response
- [ ] **Provider switch during conversation**:
  - [ ] Chat history preserved
  - [ ] Next message uses new provider
  - [ ] No "Provider changed" errors to user
- [ ] **Provider fallback works** transparently in chat
  - [ ] If primary fails, automatically uses fallback
  - [ ] User sees response without knowing fallback triggered
  - [ ] Badge shows actual provider used (fallback if applicable)
- [ ] **Error handling**:
  - [ ] If all providers fail: "All providers failed. Check Settings"
  - [ ] Link to open Settings provided
  - [ ] User can fix and retry

### Dashboard Header Integration

- [ ] **Provider indicator visible** in dashboard header
- [ ] **Shows insights provider** with model name
- [ ] **Clickable to open Settings** (optional enhancement)
- [ ] **Updates when provider changed** in Settings
- [ ] **Badge displays correctly** on different screen sizes

### Insights Widget Integration

- [ ] **Insights display** shows which provider generated them
- [ ] **Refresh/Regenerate button** works with selected provider
- [ ] **Tooltip shows** "Regenerate with [Provider]"
- [ ] **Loading state displays** while generating
- [ ] **Generation respects** selected insights provider
- [ ] **Provider switch updates** insights widget
- [ ] **Timestamp shows** generation time
- [ ] **Error recovery** if generation fails

---

## API & Backend Testing

### GET /api/ai/config

- [ ] **Returns current user config** with:
  - [ ] API keys (masked)
  - [ ] Model selections (chat, insights, global)
  - [ ] Fallback provider
- [ ] **Proper error handling**:
  - [ ] 401 if not authenticated
  - [ ] 500 if database error
- [ ] **Response time** < 200ms

### PATCH /api/ai/config

- [ ] **Updates model selection** for specified context
- [ ] **Supports batch updates** (multiple contexts at once)
- [ ] **Updates fallback provider** when specified
- [ ] **Validation**:
  - [ ] Rejects invalid provider
  - [ ] Rejects invalid model for provider
  - [ ] Rejects context other than chat/insights/global
- [ ] **Persists to database** correctly
- [ ] **Returns updated config** in response
- [ ] **Error handling**:
  - [ ] 400 if invalid payload
  - [ ] 401 if not authenticated
  - [ ] 409 if model no longer available
- [ ] **Response time** < 500ms

### POST /api/ai/config/test/{provider}

- [ ] **Tests connection** to specified provider
- [ ] **Validates API key** for provider
- [ ] **Returns connection status**:
  - [ ] `connected: true` if successful
  - [ ] `connected: false` with error code if failed
  - [ ] `latencyMs` showing response time
- [ ] **Error codes correct**:
  - [ ] INVALID_KEY
  - [ ] RATE_LIMIT
  - [ ] TIMEOUT
  - [ ] AUTH_FAILED
  - [ ] MODEL_NOT_FOUND
- [ ] **Does NOT timeout** (30s max)
- [ ] **Response time** < 30 seconds

### GET /api/ai/config/models/{provider}

- [ ] **Returns dynamic model list** from provider
- [ ] **NO hardcoded models** - all from API
- [ ] **Model data includes**:
  - [ ] ID
  - [ ] Name
  - [ ] Context window
  - [ ] Training data cutoff
  - [ ] Cost per 1k tokens (input/output)
  - [ ] Capabilities array
  - [ ] Release date
  - [ ] Status (recommended/available/deprecated)
- [ ] **Caching works**:
  - [ ] Returns cached models if fresh (<60 min)
  - [ ] Includes `cacheInfo` in response
  - [ ] `cacheAgeMinutes` shows actual age
  - [ ] `isFresh` indicates if cache is fresh
- [ ] **Force refresh**:
  - [ ] `?forceRefresh=true` ignores cache
  - [ ] Fetches fresh models from API
  - [ ] Updates cache with new timestamp
- [ ] **Error handling**:
  - [ ] 400 if invalid provider
  - [ ] 401 if not authenticated
  - [ ] 500 if provider API error
  - [ ] Still returns cached data if available
- [ ] **Reflects current provider models**:
  - [ ] New models appear after release
  - [ ] No outdated/deprecated models
  - [ ] Pricing reflects current rates

### POST /api/mcp/chat/stream

- [ ] **Uses selected provider** from config
- [ ] **Streaming works** (SSE stream):
  - [ ] Tokens arrive in real-time
  - [ ] No buffering/batching
  - [ ] Stream completes successfully
- [ ] **Fallback mechanism**:
  - [ ] If primary fails, tries fallback
  - [ ] User doesn't see fallback message (transparent)
  - [ ] Response received from fallback provider
- [ ] **Error handling**:
  - [ ] Returns error if all providers fail
  - [ ] Error message user-friendly
  - [ ] SSE error format correct

### POST /api/insights/generate

- [ ] **Uses selected insights provider**
- [ ] **Generates complete insights** without streaming
- [ ] **Respects provider fallback**
- [ ] **Includes metadata**:
  - [ ] Provider used
  - [ ] Model used
  - [ ] Generation timestamp
  - [ ] Whether fallback was used
- [ ] **Error handling** with recovery suggestion

---

## Performance Testing

### Loading Performance

- [ ] **Settings modal opens** within 1 second
- [ ] **Model list fetches** within 3 seconds
  - [ ] Initial fetch: ~2-3 seconds
  - [ ] Cached fetch: <100ms
- [ ] **Provider test completes** within 30 seconds
- [ ] **Chat response streams** with <2s first-token latency
- [ ] **Insights generate** within 60 seconds

### Caching Performance

- [ ] **Model cache hits** return in <100ms
- [ ] **Config cache hits** return in <50ms
- [ ] **Cache invalidation** happens correctly
- [ ] **No memory leaks** with repeated provider switches
- [ ] **Browser memory stable** after multiple operations

### Fallback Overhead

- [ ] **Fallback adds <500ms** latency
- [ ] **Transparent fallback** doesn't timeout
- [ ] **Multiple fallback attempts** complete within reasonable time

### Scalability

- [ ] **No N+1 queries** for model fetching
- [ ] **Batch operations** work without timeouts
- [ ] **Database indexes** on provider/context columns
- [ ] **No API rate limiting** triggered by normal use

---

## UX & Responsiveness

### Mobile Layout

- [ ] **Settings modal responsive** on small screens
- [ ] **Dropdowns accessible** with touch
- [ ] **Provider badges abbreviated** on mobile (OAI instead of OpenAI)
- [ ] **Model list** scrollable if long
- [ ] **Buttons easily tappable** (>44px height)
- [ ] **No horizontal scroll** needed

### Accessibility

- [ ] **Form labels associated** with inputs
- [ ] **ARIA labels** on provider badges
- [ ] **Keyboard navigation** works:
  - [ ] Tab through dropdowns
  - [ ] Enter to select
  - [ ] Escape to close
- [ ] **Screen reader** announces:
  - [ ] Provider names
  - [ ] Model names
  - [ ] Loading states
  - [ ] Error messages
- [ ] **Color contrast** meets WCAG standards
- [ ] **Error messages** announced

### Error Messages

- [ ] **Clear and actionable**:
  - [ ] ❌ "Invalid API key for OpenAI. Add/update key in Settings."
  - [ ] ❌ "No models available for this provider. Check API key."
  - [ ] ❌ "Provider timeout. Try again or select fallback."
- [ ] **Non-technical language** (no stack traces)
- [ ] **Helpful suggestions** for recovery
- [ ] **No error code jargon** exposed to user

### Loading States

- [ ] **Spinning loader icon** while fetching
- [ ] **"Loading..."** text visible
- [ ] **Disabled buttons/inputs** during load
- [ ] **"Refreshing..."** state during model refresh
- [ ] **Estimated time** if operation takes >2 seconds

---

## Security Testing

### API Key Management

- [ ] **API keys NOT logged** in console
- [ ] **API keys NOT sent in URLs** (POST body only)
- [ ] **API keys encrypted** in database
- [ ] **API keys masked** in UI display
  - [ ] Show only last 4 chars: "sk-***...xxxx"
- [ ] **API keys NOT cached** in localStorage
- [ ] **API keys cleared** on logout

### Data Privacy

- [ ] **User provider config isolated** per user
- [ ] **No data leakage** between users
- [ ] **Request/response logging** doesn't include API keys
- [ ] **Error messages** don't expose API keys

### CORS & Headers

- [ ] **CORS configured** correctly
- [ ] **Frontend can call** all required endpoints
- [ ] **Origin validation** works
- [ ] **No CORS bypass** vulnerabilities

---

## Localization (Portuguese Support)

- [ ] **Labels in Portuguese**:
  - [ ] "Seleção de Modelo"
  - [ ] "Modelos Ativos"
  - [ ] "Atualizar Lista de Modelos"
  - [ ] "Testar Conexão"
- [ ] **Buttons translated**:
  - [ ] "Salvar Alterações"
  - [ ] "Cancelar"
  - [ ] "Atualizar"
- [ ] **Error messages in Portuguese**:
  - [ ] "Falha ao carregar modelos"
  - [ ] "Chave de API inválida"
  - [ ] "Conexão com provedor perdida"
- [ ] **Time displays properly**:
  - [ ] "5 minutos atrás"
  - [ ] "acabei de agora"
- [ ] **No hardcoded English** text in UI

---

## Edge Cases

- [ ] **User with NO providers configured**:
  - [ ] Can still open Settings
  - [ ] Sees message: "Add API keys to configure providers"
  - [ ] Can add first API key
- [ ] **User with MULTIPLE providers**:
  - [ ] Can switch between them
  - [ ] Each context can have different provider
  - [ ] No provider conflicts
- [ ] **Provider API down**:
  - [ ] Falls back to cached models if available
  - [ ] Shows error: "Unable to fetch models, using cached data"
  - [ ] Retry button works
- [ ] **Network disconnection**:
  - [ ] Settings modal handles gracefully
  - [ ] Error message shown
  - [ ] User can still change local selection
- [ ] **Rapid provider switches**:
  - [ ] No race conditions
  - [ ] Final selection persists
  - [ ] No duplicate requests
- [ ] **Cache expiration during use**:
  - [ ] Still shows old data
  - [ ] User can refresh manually
  - [ ] Next Settings open fetches fresh
- [ ] **User cancels mid-save**:
  - [ ] Settings dialog closes
  - [ ] Unsaved changes kept (not saved)
  - [ ] Re-opening shows pending changes

---

## Regression Testing

### Existing Features Still Work

- [ ] **Chat functionality unaffected**
  - [ ] Can still send messages
  - [ ] Responses still arrive
  - [ ] History still loads
- [ ] **Insights generation unaffected**
  - [ ] Can still regenerate
  - [ ] Insights display correctly
  - [ ] Timestamps accurate
- [ ] **Dashboard layout unchanged**
  - [ ] All widgets display
  - [ ] No visual regressions
  - [ ] Responsive design works
- [ ] **Settings modal** (other sections):
  - [ ] API keys section still works
  - [ ] Notifications section works
  - [ ] Profile section works
- [ ] **Switching between dashboard views** works
- [ ] **Page reload** preserves configuration

---

## Performance Benchmarks

Record baseline measurements:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Settings modal open | <1s | _____ | [ ] |
| Model list fetch (first) | <3s | _____ | [ ] |
| Model list fetch (cached) | <100ms | _____ | [ ] |
| Provider test | <30s | _____ | [ ] |
| Config save | <500ms | _____ | [ ] |
| Chat first token | <2s | _____ | [ ] |
| Insights generate | <60s | _____ | [ ] |
| Page load with config | <2s | _____ | [ ] |

---

## Sign-Off

- [ ] **All functional tests** pass
- [ ] **All integration tests** pass
- [ ] **All E2E tests** pass
- [ ] **No console errors** in happy path
- [ ] **No console warnings** in happy path
- [ ] **Mobile responsive** verified
- [ ] **Accessibility** verified
- [ ] **Performance** meets targets
- [ ] **Security** review passed
- [ ] **User feedback** positive

**QA Engineer**: _________________ **Date**: _________

**Product Manager**: _________________ **Date**: _________

**Release Ready**: [ ] Yes [ ] No
