-- Migration: Create conversations and conversation_messages tables
-- Purpose: Store chat conversations with contextual awareness

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Nova Conversa',

  -- Context information
  context_type VARCHAR(50) NOT NULL DEFAULT 'global', -- 'global', 'project', 'note'
  context_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  context_note_path TEXT,

  -- Metadata
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_preview TEXT,
  detected_tags TEXT[], -- Array of tags detected in conversation

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT conversations_context_check CHECK (
    context_type IN ('global', 'project', 'note')
  )
);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message data
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,

  -- Context snapshot (when message was sent)
  context_snapshot JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT conversation_messages_role_check CHECK (
    role IN ('user', 'assistant')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_context_type ON conversations(context_type);
CREATE INDEX IF NOT EXISTS idx_conversations_context_project_id ON conversations(context_project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_detected_tags ON conversations USING GIN(detected_tags);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_context_snapshot ON conversation_messages USING GIN(context_snapshot);

-- Function to update conversation's updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    updated_at = NOW(),
    message_count = message_count + 1,
    last_message_preview = LEFT(NEW.content, 100)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation when new message is added
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON conversation_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Function to cleanup old conversations (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_conversations(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM conversations
    WHERE updated_at < NOW() - INTERVAL '1 day' * days_old
    AND message_count = 0
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your user setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_messages TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Add comments for documentation
COMMENT ON TABLE conversations IS 'Stores chat conversations with contextual awareness (project, note, or global)';
COMMENT ON TABLE conversation_messages IS 'Stores individual messages within conversations';
COMMENT ON COLUMN conversations.context_type IS 'Type of context: global, project, or note';
COMMENT ON COLUMN conversations.context_project_id IS 'Reference to project/collection if context_type is project';
COMMENT ON COLUMN conversations.context_note_path IS 'Path to note in vault if context_type is note';
COMMENT ON COLUMN conversations.detected_tags IS 'Array of tags automatically detected from conversation';
COMMENT ON COLUMN conversation_messages.context_snapshot IS 'Snapshot of context when message was sent (for history/audit)';
