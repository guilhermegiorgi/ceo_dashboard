-- Migration: Create AI providers configuration
-- Purpose: Store API keys and model configurations for different AI providers

-- Create ai_providers table
CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Provider information
  provider_name VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google', 'openrouter', etc.
  display_name VARCHAR(100) NOT NULL,

  -- API Configuration
  api_key_encrypted TEXT NOT NULL, -- Encrypted API key
  base_url TEXT, -- Optional custom base URL

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT ai_providers_provider_check CHECK (
    provider_name IN ('openai', 'anthropic', 'google', 'openrouter', 'azure', 'custom')
  ),
  CONSTRAINT ai_providers_unique_user_provider UNIQUE (user_id, provider_name)
);

-- Create ai_models table
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,

  -- Model information
  model_id VARCHAR(100) NOT NULL, -- e.g., 'gpt-4', 'claude-3-opus-20240229'
  display_name VARCHAR(150) NOT NULL,
  description TEXT,

  -- Capabilities
  supports_streaming BOOLEAN NOT NULL DEFAULT true,
  supports_function_calling BOOLEAN NOT NULL DEFAULT false,
  supports_vision BOOLEAN NOT NULL DEFAULT false,

  -- Limits
  max_tokens INTEGER,
  context_window INTEGER,

  -- Pricing (per 1M tokens)
  cost_per_input_token DECIMAL(10, 6),
  cost_per_output_token DECIMAL(10, 6),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- Usage tracking
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ai_models_unique_provider_model UNIQUE (provider_id, model_id)
);

-- Create conversation_model_config table (links conversations to models)
CREATE TABLE IF NOT EXISTS conversation_model_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE RESTRICT,

  -- Model parameters
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INTEGER,
  top_p DECIMAL(3, 2) DEFAULT 1.0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT conversation_model_config_unique_conversation UNIQUE (conversation_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_providers_user_id ON ai_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON ai_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_default ON ai_providers(is_default);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider_id ON ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_is_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_models_is_default ON ai_models(is_default);

CREATE INDEX IF NOT EXISTS idx_conversation_model_config_conversation_id ON conversation_model_config(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_model_config_model_id ON conversation_model_config(model_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_ai_provider_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ai_model_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_update_ai_provider_timestamp ON ai_providers;
CREATE TRIGGER trigger_update_ai_provider_timestamp
BEFORE UPDATE ON ai_providers
FOR EACH ROW
EXECUTE FUNCTION update_ai_provider_timestamp();

DROP TRIGGER IF EXISTS trigger_update_ai_model_timestamp ON ai_models;
CREATE TRIGGER trigger_update_ai_model_timestamp
BEFORE UPDATE ON ai_models
FOR EACH ROW
EXECUTE FUNCTION update_ai_model_timestamp();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_providers TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_models TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_model_config TO postgres;

-- Comments
COMMENT ON TABLE ai_providers IS 'Stores AI provider configurations with encrypted API keys';
COMMENT ON TABLE ai_models IS 'Stores available models for each provider';
COMMENT ON TABLE conversation_model_config IS 'Links conversations to specific models and their parameters';
COMMENT ON COLUMN ai_providers.api_key_encrypted IS 'Encrypted API key using server-side encryption';
COMMENT ON COLUMN ai_models.context_window IS 'Maximum context window in tokens';
COMMENT ON COLUMN conversation_model_config.temperature IS 'Sampling temperature (0.0 to 2.0)';

-- Insert default providers (without API keys - user must configure)
-- Users will add their own API keys through the settings interface
