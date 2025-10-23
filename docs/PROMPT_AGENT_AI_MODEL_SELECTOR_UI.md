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

## Acceptance Criteria

### 1. Settings Modal Enhancement
**File**: `src/components/SettingsModalRefactored.tsx` or relevant settings section

Add new section: "AI Model Selection" (after API Keys section)

Visual layout:
```
┌─ AI MODEL SELECTION ─────────────────────────┐
│                                              │
│ Current Active Models:                       │
│ ┌─ Chat           🟢 OpenAI - gpt-4-turbo   │
│ ┌─ Insights       🔵 Anthropic - claude-3   │
│ ┌─ Global         🟢 OpenAI - gpt-4         │
│                                              │
│ ┌─ SELECT MODELS BY CONTEXT ─────────────────│
│                                              │
│ 📝 Chat Conversations                        │
│   Provider:  [OpenAI ▼]                     │
│   Model:     [gpt-4-turbo ▼]                │
│   Context:   8k | $0.03/$0.06 per 1k tokens│
│   [Test Connection ✓]                       │
│                                              │
│ 💡 Insights & Analysis                       │
│   Provider:  [Anthropic ▼]                  │
│   Model:     [claude-3-opus ▼]              │
│   Context:   200k | $15/$75 per 1M tokens   │
│   [Test Connection ✓]                       │
│                                              │
│ 🌐 Global Operations                         │
│   Provider:  [OpenAI ▼]                     │
│   Model:     [gpt-4 ▼]                      │
│   Context:   8k | $0.03/$0.06 per 1k tokens│
│   [Test Connection ✓]                       │
│                                              │
│ ⚙️ Fallback Configuration                    │
│   Use as fallback: [Anthropic ▼]            │
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
- Populates based on selected provider
- Shows model name + capabilities
- Format: "gpt-4-turbo (8k context, $0.03/$0.06 per 1k)"

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
At top of section, show current configuration:

```
Current Active Models:
┌─────────────────────────────────────┐
│ Chat:     🟢 OpenAI - gpt-4-turbo  │
│ Insights: 🔵 Anthropic - claude-3  │
│ Global:   🟢 OpenAI - gpt-4        │
└─────────────────────────────────────┘
```

Updates in real-time when user selects different models.

### 5. Integration Points

**Data Loading**:
- On mount, call `getAIConfig()` to fetch current selections
- Populate dropdowns based on available providers (those with API keys)
- Display current selection

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
- **Caching**: Cache `getAIConfig()` results (5 min TTL already implemented)
- **Real-time**: When user saves here, ChatWidget and other components should update instantly via context
- **Validation**: Only show providers with valid API keys in dropdowns
- **Mobile-friendly**: Compact layout on small screens

## Testing Checklist

- [ ] Settings modal opens and shows AI Model Selection section
- [ ] Current models display correctly
- [ ] Provider dropdown shows only providers with API keys
- [ ] Model dropdown populates based on selected provider
- [ ] Model info displays (context, cost, capabilities)
- [ ] Test Connection button works for each provider
- [ ] Changing models shows unsaved indicator
- [ ] Save persists to backend + localStorage
- [ ] Cancel reverts changes
- [ ] Error handling for invalid/missing API keys
- [ ] ChatWidget updates when model selection saved
- [ ] FocusSummaryWidget uses selected insights model
- [ ] Mobile layout looks good

## Effort Estimate
**30-40 minutes** (UI + integration with existing contexts + testing)

## Why This is Critical
User cannot work on daily focus features until they can:
1. ✅ Select which AI provider to use for insights
2. ✅ See that selection in the UI
3. ✅ Change it if needed
4. ✅ Know that it's actually being used

## Related Files
- `src/components/SettingsModalRefactored.tsx`
- `src/contexts/AIProviderContext.tsx` (use it)
- `src/hooks/useAIProvider.ts` (use it)
- `src/hooks/useAPI.tsx` (use getAIConfig, updateAIConfig, testAIProvider)
- `src/services/apiClient.ts` (methods already there)
- Backend: `/api/ai/config` endpoints (already working)
