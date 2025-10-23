# PROMPT_AGENT_FRONTEND_AI_PROVIDER_INTEGRATION.md

## Mission
Wire the AI Provider framework into the frontend UI - connect contexts, hooks, and settings to display active model info and allow real-time provider/model switching.

## Context
- Backend has: `aiProviderRouter.js`, `aiConfigService.js`, and `/api/ai/config` endpoints fully working
- Backend services (chat, insights) are routing through selected provider/model
- Frontend has: `AIProviderContext.tsx`, `useAIProvider()` hook, settings components ready
- **Missing**: Frontend UI not displaying which provider/model is active, and no live UI updates when user switches providers

## Acceptance Criteria

### 1. ChatWidget Integration
**File**: `src/components/ChatWidget.tsx`
- Display active provider and model name above chat input
  - Format: "Using OpenAI - gpt-4-turbo" (or similar)
  - Update in real-time when settings change
- Show provider icon (if available) next to the model name
- On message send, pass provider context to `/api/mcp/chat/stream` (via headers or body)
- Handle provider switching mid-conversation gracefully

### 2. Dashboard Header Enhancement
**File**: `src/components/workflow/DashboardHeader.tsx`
- Add small indicator showing current AI provider/model
- Make it clickable → opens Settings modal
- Show with visual badge (e.g., "OpenAI" in orange, "Anthropic" in blue)

### 3. Insights Widget Update
**File**: `src/components/workflow/FocusSummaryWidget.tsx`
- Display which provider is used for insights generation
- Show refresh button with "Regenerate with [Provider]" tooltip
- Update header when insights are fetched with new provider config

### 4. Settings Modal UI Refinement
**File**: `src/components/SettingsModalRefactored.tsx` + sections
- Add visual feedback when model is selected
  - Highlight selected model with checkmark or color
  - Show model capabilities (context window, training date, etc.)
- Add "Test Connection" button per provider
  - Calls `/api/ai/config/test/{provider}`
  - Shows connection status (✅ Connected / ❌ Failed)
- Display current active model in each context section (chat, insights, global)
  - "Currently using: gpt-4" in gray text

### 5. Context Wiring
**File**: `src/contexts/AIProviderContext.tsx` (enhance if needed)
- Ensure context properly broadcasts provider/model changes to all subscribers
- Add method to get "display name" for each provider (e.g., "OpenAI" → "🟢 OpenAI GPT-4")
- Persist selection to localStorage AND backend immediately on change

### 6. Hook Enhancement
**File**: `src/hooks/useAIProvider.tsx` (create if not exists)
- Return current provider and model in active context (chat/insights/global)
- Provide method to switch provider: `switchProvider(provider, model)`
- Provide method to test connection: `testConnection(provider)`
- Include loading/error states

### 7. API Client Integration
**File**: `src/services/apiClient.ts`
- Add helper method: `getAIConfig()` → fetch current config from `/api/ai/config`
- Add helper method: `testAIProvider(provider)` → calls `/api/ai/config/test/{provider}`
- Add helper method: `updateAIModel(context, provider, model)` → calls `/api/ai/config/update`

### 8. Real-time Updates
- When user changes provider in Settings:
  1. Update backend via `/api/ai/config/update`
  2. Refresh AIProviderContext
  3. All subscribed components (ChatWidget, FocusSummaryWidget, DashboardHeader) update instantly
  4. Next message/insight uses new provider

## Implementation Notes

- **Don't break existing flows**: Chat and insights should continue working during provider switches
- **Graceful degradation**: If provider fails, show error but allow fallback or retry
- **Visual hierarchy**: Model selection should be prominent in Settings, but active model should be subtle in chat UI
- **Mobile-friendly**: Provider info on mobile should be compact (maybe just icon or tooltip)

## Testing Checklist

- [ ] Switch provider in Settings → ChatWidget updates instantly
- [ ] Generate insights with Provider A → change to Provider B → regenerate → uses Provider B
- [ ] Test connection button works for each provider
- [ ] Context persists on page reload
- [ ] Mobile view shows provider info without breaking layout

## Effort Estimate
**40-50 minutes** (UI wiring + context integration + testing)

## Related Files
- `src/components/ChatWidget.tsx`
- `src/components/workflow/DashboardHeader.tsx`
- `src/components/workflow/FocusSummaryWidget.tsx`
- `src/components/SettingsModalRefactored.tsx`
- `src/contexts/AIProviderContext.tsx`
- `src/hooks/useAIProvider.tsx` (or enhance existing)
- `src/services/apiClient.ts`
- Backend: `/api/ai/config` endpoints (already done)
