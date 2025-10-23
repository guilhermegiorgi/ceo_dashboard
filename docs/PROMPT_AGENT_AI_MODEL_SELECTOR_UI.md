# PROMPT_AGENT_AI_MODEL_SELECTOR_UI.md

## Mission
Implement the visual AI Model Selector in Settings modal - allow users to select which AI provider and model to use for chat, insights, and global operations.

## Context
- Backend has: `/api/ai/config` endpoints fully working
- Frontend has: `AIProviderContext`, `useAIProvider()`, `useAPI()` with AI helpers
- **Missing**: Visual UI in Settings modal to SELECT and DISPLAY which models are active
- User needs this before working on daily focus features that depend on AI

## Problem Identified
The model selection UI that should appear in Settings has disappeared or was never visually implemented. Users cannot:
- See which AI provider is currently selected
- Change the provider/model for different contexts (chat, insights, global)
- View model capabilities or test connections
- Select fallback provider

## Critical Requirement: Dynamic Model Loading
**Models must be fetched dynamically, NOT hardcoded**
- Use `getProviderModels(provider)` API endpoint to fetch current available models
- Update automatically as new models are released by providers
- Cache with short TTL (30-60 minutes) to balance freshness vs performance
- Allow manual "Refresh Models" button to force update
- Display loading state while fetching models

## Acceptance Criteria

### 1. Settings Modal Enhancement
**File**: `src/components/SettingsModalRefactored.tsx` or relevant settings section

Add new section: "AI Model Selection" (after API Keys section)

Visual layout:
```
┌─ AI MODEL SELECTION ─────────────────────────┐
│                                              │
│ Current Active Models:                       │
│ ┌─ Chat           🟢 [Loading...] ↻         │
│ ┌─ Insights       🔵 [Loading...] ↻         │
│ ┌─ Global         🟢 [Loading...] ↻         │
│                                              │
│ [↻ Refresh Model List] (force update)       │
│ Last updated: just now                       │
│                                              │
│ ┌─ SELECT MODELS BY CONTEXT ─────────────────│
│                                              │
│ 📝 Chat Conversations                        │
│   Provider:  [Select Provider ▼]            │
│              (loading available providers...)│
│   Model:     [Select Model ▼]               │
│              (select provider first)         │
│   Model Info: (displays when model selected)│
│     • Context Window: [fetched from API]    │
│     • Training Data: [fetched from API]     │
│     • Cost: [fetched from API]              │
│     • Capabilities: [fetched from API]      │
│   [Test Connection ✓]                       │
│                                              │
│ 💡 Insights & Analysis                       │
│   Provider:  [Select Provider ▼]            │
│   Model:     [Select Model ▼]               │
│   Model Info: (dynamic)                     │
│   [Test Connection ✓]                       │
│                                              │
│ 🌐 Global Operations                         │
│   Provider:  [Select Provider ▼]            │
│   Model:     [Select Model ▼]               │
│   Model Info: (dynamic)                     │
│   [Test Connection ✓]                       │
│                                              │
│ ⚙️ Fallback Configuration                    │
│   Use as fallback: [Select Provider ▼]      │
│   (when primary provider fails)              │
│                                              │
│                    [Save Changes] [Cancel]  │
└─────────────────────────────────────────────┘
```

### 2. Three Context Sections
Each context (Chat, Insights, Global) should have:

**Provider Dropdown**
- Shows only providers with valid API keys configured
- If no API key, show: "[Provider] - Add API key first"
- Selected provider shows with colored badge (OpenAI=orange, Anthropic=blue, etc)

**Model Dropdown**
- Fetches available models dynamically from `getProviderModels(provider)` when provider changes
- Shows loading spinner while fetching: "Loading models..."
- Displays model name + key info from API response
- Format: "[model-name] - [context-window]k tokens"
- Updates automatically as new models are released by providers
- Gracefully handles API errors: "Failed to load models, please try again"

**Model Info Display**
- Context window size
- Training data cutoff (if available)
- Cost per token (input/output)
- Capabilities badges (streaming, function-calling, vision, etc)

**Test Connection Button**
- Calls `/api/ai/config/test/{provider}`
- Shows ✅ Connected or ❌ Failed
- If failed, shows reason: "Invalid API key" or "Rate limited" etc
- Disabled if no API key configured

### 3. Fallback Provider Selection
**File**: Same settings section

Display and allow selection:
```
⚙️ Fallback Configuration

Primary provider fails → Use this:  [Anthropic ▼]
(Other configured providers available: OpenAI, Google, etc)

[Test Fallback Connection]
```

### 4. Current Active Display
At top of section, show current configuration fetched from API:

```
Current Active Models:
┌────────────────────────────────────────────────────┐
│ Chat:     🟢 [Loading...] ↻                        │
│ Insights: 🔵 [Loading...] ↻                        │
│ Global:   🟢 [Loading...] ↻                        │
│                                                    │
│ [↻ Refresh] Last updated: just now                │
└────────────────────────────────────────────────────┘
```

Updates in real-time when user selects different models.
Each item shows: Provider Badge + Model Name + Refresh icon
Format: "🟢 OpenAI - [model-name]" (fetched from getAIConfig response)

### 5. Dynamic Model Loading Strategy

**On Component Mount**:
- Call `getAIConfig()` to get current provider selections
- For each configured provider (those with API keys):
  - Call `getProviderModels(provider)` to fetch available models
  - Store in component state with timestamp
  - Display in dropdowns with latest data

**When Provider Dropdown Changes**:
- Check cache: if models for this provider exist and cache is fresh (<60 min):
  - Use cached models
  - Show "Last updated: X minutes ago"
- If cache expired or missing:
  - Show loading spinner: "Loading available models..."
  - Call `getProviderModels(selectedProvider)`
  - Update cache with timestamp
  - Populate model dropdown

**Refresh Models Button**:
- Allow user to manually force refresh
- Clear all caches
- Reload all provider models from API
- Show "Refreshing..." state during load
- Show notification when complete: "Model list updated"

**Error Handling During Load**:
- If `getProviderModels()` fails:
  - Show error: "⚠️ Failed to load models for [Provider]"
  - Try fallback: show previously cached models if available
  - Show retry button: "Try again"

### 6. Integration Points (Updated)

**Data Loading**:
- On mount, call `getAIConfig()` to fetch current selections
- Fetch model lists for all providers with valid API keys
- Display current selection with dynamic model data
- Show cache timestamp: "Last updated: just now" or "5 minutes ago"

**On Provider/Model Change**:
- Update local component state
- Show unsaved indicator: "[•] You have unsaved changes"
- Enable "Save Changes" button

**On Save**:
- For each context (chat, insights, global):
  - Call `updateAIConfig(context, {provider, model})`
  - Show loading spinner
  - Show ✅ saved or ❌ error
- Update global `AIProviderContext`
- Persist to localStorage
- Disable "Save Changes" button
- Show toast: "AI models updated successfully"

**On Cancel**:
- Revert to last saved state
- Hide unsaved indicator

### 6. Error Handling
- If API key invalid for selected provider:
  - Show warning: "⚠️ No valid API key for [Provider]"
  - Disable model selection for that provider
  - Suggest: "Add/update API key above"

- If model not available:
  - Show error: "Model not available"
  - Fall back to first available model
  - Log error for debugging

- If save fails:
  - Show error toast: "Failed to save AI model configuration"
  - Keep changes in UI for retry
  - Show retry button

### 7. Component Structure

```typescript
<AIModelSelectionSection>
  ├─ CurrentActiveModels (displays: Chat, Insights, Global)
  ├─ ModelContextSection (for each: Chat, Insights, Global)
  │  ├─ ProviderSelector (dropdown)
  │  ├─ ModelSelector (dropdown, depends on provider)
  │  ├─ ModelInfo (capabilities, context, cost)
  │  └─ TestConnectionButton
  ├─ FallbackProviderSelector
  └─ ActionButtons (Save, Cancel)
```

### 8. Responsive Design
- On mobile: dropdowns stack vertically
- Provider badges show abbreviated (e.g., "OAI" instead of "OpenAI")
- Model info tooltip on hover/tap
- Test button icon-only on mobile

## Implementation Notes

- **Don't break existing flows**: Chat and insights should continue working during this UI implementation
- **Use existing hooks**: `useAIProvider()`, `useAPI()` with the AI helpers already available
- **NO HARDCODED MODELS**: All model data must come from `getProviderModels(provider)` API calls
- **Smart Caching**:
  - Cache provider models for 60 minutes to reduce API calls
  - Store cache timestamp and show to user ("Last updated: 5 min ago")
  - Allow manual refresh button to clear cache and reload
  - Fall back to cached data if API fails
- **Real-time**: When user saves here, ChatWidget and other components should update instantly via context
- **Validation**: Only show providers with valid API keys in dropdowns
- **Mobile-friendly**: Compact layout on small screens
- **Loading States**: Show spinners and "Loading..." text while fetching models
- **Error Recovery**: If model fetch fails, show error message + retry button + fall back to cached data if available

## Testing Checklist

### Dynamic Model Loading
- [ ] On mount, `getProviderModels()` called for each provider with API key
- [ ] Model list updates automatically when provider changes
- [ ] Loading spinner shows while fetching models
- [ ] "Last updated: X minutes ago" displays correctly
- [ ] Cache respects 60-minute TTL
- [ ] Refresh button clears cache and reloads all models
- [ ] If model fetch fails, error message shown + fallback to cached data
- [ ] No hardcoded model names anywhere in code
- [ ] Models reflect current provider capabilities (no outdated models)

### Core Functionality
- [ ] Settings modal opens and shows AI Model Selection section
- [ ] Current models display with dynamic data (not hardcoded)
- [ ] Provider dropdown shows only providers with API keys
- [ ] Model dropdown populates dynamically based on selected provider
- [ ] Model info displays (context, cost, capabilities from API)
- [ ] Test Connection button works for each provider
- [ ] Changing models shows unsaved indicator
- [ ] Save persists to backend + localStorage
- [ ] Cancel reverts changes
- [ ] Error handling for invalid/missing API keys

### Integration
- [ ] ChatWidget updates when model selection saved
- [ ] FocusSummaryWidget uses selected insights model
- [ ] Daily focus features can access selected AI model

### UX & Responsiveness
- [ ] Mobile layout looks good
- [ ] Loading states clear and informative
- [ ] Error messages helpful and actionable
- [ ] Refresh functionality works reliably

## Effort Estimate
**30-40 minutes** (UI + integration with existing contexts + testing)

## Why This is Critical
User cannot work on daily focus features until they can:
1. ✅ Select which AI provider to use for insights
2. ✅ See that selection in the UI
3. ✅ Change it if needed
4. ✅ Know that it's actually being used

## API Integration Requirements

**Must Use These Functions** (already implemented in useAPI hook):

```typescript
// Fetch current user configuration
const config = await getAIConfig()
// Returns: {apiKeys, modelSelection: {chat, insights, global}, fallbackProvider}

// Fetch available models for a specific provider (DYNAMIC)
const models = await getProviderModels(provider)
// Returns: Array of {id, name, contextWindow, trainingDataCutoff, cost, capabilities}

// Update model selection for a context
const result = await updateAIConfig(context, {provider, model})
// context: 'chat' | 'insights' | 'global'

// Test connection to a provider
const testResult = await testAIProvider(provider)
// Returns: {connected: boolean, error?: string}
```

**Key Points**:
- All model data flows from `getProviderModels()` - no hardcoded lists
- Cache models in component state with timestamp
- Respect 60-minute cache TTL
- Show "Last updated" to user
- Allow manual refresh to clear cache

## Related Files
- `src/components/SettingsModalRefactored.tsx`
- `src/contexts/AIProviderContext.tsx` (use it)
- `src/hooks/useAIProvider.ts` (use it)
- `src/hooks/useAPI.tsx` (use getAIConfig, updateAIConfig, testAIProvider, getProviderModels)
- `src/services/apiClient.ts` (methods already there)
- Backend: `/api/ai/config` endpoints (already working)
