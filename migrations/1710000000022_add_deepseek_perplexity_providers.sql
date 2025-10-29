-- Migration: Add DeepSeek and Perplexity providers to constraint
-- Purpose: Allow 'deepseek' and 'perplexity' as valid provider names

-- Drop and recreate the constraint to include new providers
ALTER TABLE ai_providers DROP CONSTRAINT ai_providers_provider_check;

ALTER TABLE ai_providers ADD CONSTRAINT ai_providers_provider_check CHECK (
  provider_name IN ('openai', 'anthropic', 'google', 'openrouter', 'azure', 'custom', 'deepseek', 'perplexity', 'gemini')
);
