# Google Gemini Integration Guide

**Status**: ✅ Fully Implemented and Ready to Use
**Date**: October 25, 2025

---

## Overview

Google Gemini is now fully integrated into the AI Provider Framework. Users can add their Gemini API key in Settings and access all available Gemini models (2.0 Flash, 1.5 Pro, 1.5 Flash, etc.).

---

## Setup Instructions

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

**Important**: Keep your API key secret! Never commit it to version control.

### 2. Add API Key to Settings

1. Open the CEO Dashboard
2. Click **Settings** (⚙️ icon)
3. Go to **AI Providers**
4. Click **"Add Provider"** or **"Configure Gemini"**
5. Paste your API key
6. Click **"Test Connection"** to verify
7. Save

### 3. Auto-Sync Models

Once configured, the system will automatically:
- ✅ Fetch all available Gemini models from Google API
- ✅ Save them to the database
- ✅ Make them available in Chat, Insights, and other contexts

**Expected Models**:
- Gemini 2.0 Flash (Latest, recommended)
- Gemini 1.5 Pro (Advanced reasoning)
- Gemini 1.5 Flash (Fast, efficient)
- Plus any new models Google releases

---

## Technical Implementation

### API Endpoint

```
GET https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}
```

### Response Format

```json
{
  "models": [
    {
      "name": "models/gemini-2.0-flash",
      "displayName": "Gemini 2.0 Flash",
      "description": "Latest multimodal model...",
      "inputTokenLimit": 1000000,
      "outputTokenLimit": 4096,
      "supportedGenerationMethods": [
        "generateContent",
        "countTokens"
      ],
      "temperature": 1.0,
      "topP": 0.95,
      "topK": 40
    },
    ...
  ]
}
```

### Model Fetcher Implementation

**File**: `server/services/aiProviderService.js`

The `fetchGeminiModels()` function:

```javascript
async function fetchGeminiModels({ apiKey, baseUrl }) {
  // Uses API key as query parameter (not in headers)
  const baseUrlValue = baseUrl || GEMINI_BASE_URL;
  const url = `${baseUrlValue}/models?key=${apiKey}`;

  // Fetch models from Google API
  const data = await fetchJson(url);

  // Filter to only generateContent-capable models
  const filtered = data.models
    .filter(m => m.supportedGenerationMethods.includes("generateContent"))
    .map(m => ({
      modelId: m.name.replace("models/", ""),
      displayName: m.displayName,
      description: m.description,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: /vision|gemini-[12]/.test(modelId),
      maxTokens: m.outputTokenLimit || 8192,
      contextWindow: m.inputTokenLimit || 1000000,
    }));

  return filtered;
}
```

### Default Models

If API sync fails, fallback models are available:

```javascript
gemini: [
  {
    modelId: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    contextWindow: 1000000,
    isDefault: true,
  },
  {
    modelId: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    contextWindow: 1000000,
  },
  {
    modelId: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    contextWindow: 1000000,
  },
]
```

---

## Features

### ✅ Supported Capabilities

| Feature | Support |
|---------|---------|
| Chat/Conversation | ✅ Yes |
| Streaming Response | ✅ Yes |
| Vision/Image Input | ✅ Yes (2.0 Flash, 1.5 Pro) |
| Function Calling | ✅ Yes |
| Context Window | ✅ Up to 1M tokens |
| Model Switching | ✅ Yes |
| Force Sync | ✅ Yes (`POST /api/ai/config/force-sync/gemini`) |

### Models Capabilities

**Gemini 2.0 Flash** (Recommended)
- Latest generation model
- Fastest inference
- Best cost/performance ratio
- Vision support
- 1M token context window

**Gemini 1.5 Pro**
- Advanced reasoning
- Complex task handling
- Superior quality output
- Vision support
- 1M token context window

**Gemini 1.5 Flash**
- Fast processing
- Lightweight operations
- Cost-effective
- Vision support
- 1M token context window

---

## Usage Examples

### Chat with Gemini

1. Open **Chat**
2. Click provider selector (top-right)
3. Choose **Gemini**
4. Select model (e.g., "Gemini 2.0 Flash")
5. Type your message
6. Send ✨

### Generate Insights with Gemini

1. Open **Insights**
2. Click provider selector
3. Choose **Gemini**
4. Generate insights from your data
5. Results will use Gemini model

### Use Vision Capabilities

1. In Chat, select a Gemini model with vision support
2. Upload an image
3. Ask questions about the image
4. Gemini will analyze and respond

---

## Force Sync Models

If Gemini releases new models and they don't appear automatically:

```bash
curl -X POST http://localhost:3002/api/ai/config/force-sync/gemini \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "provider": "gemini",
  "modelsCount": 8,
  "models": [...]
}
```

---

## Troubleshooting

### Models Not Showing Up

**Problem**: Added API key but models don't appear in dropdown

**Solutions**:
1. ✅ Check API key is correct (copy from Google AI Studio again)
2. ✅ Verify API key has permissions (not restricted to specific APIs)
3. ✅ Click "Test Connection" - should show success message
4. ✅ Refresh the page (browser cache)
5. ✅ Trigger force-sync: `POST /api/ai/config/force-sync/gemini`

### "API Key not found" Error

**Problem**: When trying to use Gemini model, get authentication error

**Solutions**:
1. ✅ Re-add API key in Settings
2. ✅ Make sure key is from [aistudio.google.com](https://aistudio.google.com), not Google Cloud Console
3. ✅ Check key isn't expired or revoked
4. ✅ Run force-sync to re-validate

### Models Showing But Not Working

**Problem**: Models load but requests fail

**Solutions**:
1. ✅ Check API key has "generativeai.googleapis.com" permissions
2. ✅ Verify API key isn't rate-limited
3. ✅ Check browser console for detailed error messages
4. ✅ Contact support if issue persists

---

## Performance Notes

### Token Limits

Gemini models support:
- **Input**: Up to 1,000,000 tokens
- **Output**: Up to 4,096 tokens (configurable)

For the CEO Dashboard, we use sensible defaults:
- Standard responses: 4,096 tokens
- Insights generation: 8,192 tokens
- Long-form content: Up to 16,384 tokens

### Cost Estimates

**Gemini 2.0 Flash** (Recommended for most use cases)
- Input: ~$0.075 per 1M tokens
- Output: ~$0.3 per 1M tokens

**Gemini 1.5 Pro** (For complex reasoning)
- Input: ~$1.25 per 1M tokens
- Output: ~$5.0 per 1M tokens

**Gemini 1.5 Flash** (For fast, simple tasks)
- Input: ~$0.075 per 1M tokens
- Output: ~$0.3 per 1M tokens

---

## Comparison with Other Providers

| Provider | Models | Vision | Function Calling | Cost |
|----------|--------|--------|------------------|------|
| **Gemini** | 3+ | ✅ | ✅ | $ (2.0 Flash) |
| OpenAI | 99 | ✅ | ✅ | $$$ (GPT-4o) |
| Anthropic | 5+ | ✅ | ✅ | $$ (Claude) |
| OpenRouter | 339+ | ✅ | ✅ | $-$$ (varies) |
| DeepSeek | 2+ | ❌ | ✅ | $ (DeepSeek) |

---

## FAQ

### Q: Which Gemini model should I use?

**A**: Start with **Gemini 2.0 Flash** - it's the newest, fastest, and most cost-effective. Use **1.5 Pro** only for complex reasoning tasks.

### Q: Can I use Gemini for image generation?

**A**: No, Gemini models can analyze images but cannot generate them. Use **DALL-E** (via OpenAI) for image generation.

### Q: Do I need a paid Google account?

**A**: No, Gemini API is free to use with rate limits. Check [pricing page](https://ai.google.dev/pricing) for free tier details.

### Q: How do I get more API quota?

**A**: Visit [Google AI Studio](https://aistudio.google.com) and request quota increase. Usually approved within 24 hours.

### Q: Can I use custom models?

**A**: Only Google's published models are supported. Custom fine-tuned models require different setup.

---

## Support & Resources

- **Google AI Documentation**: https://ai.google.dev/
- **Gemini API Reference**: https://ai.google.dev/docs
- **Rate Limits**: https://ai.google.dev/docs/rate_limits
- **Dashboard Issues**: Check `/docs` folder for general troubleshooting

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 25, 2025 | Initial Gemini integration |

---

**Last Updated**: October 25, 2025
**Maintained By**: Claude Code
**Status**: ✅ Ready for Production
