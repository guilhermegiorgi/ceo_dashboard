/**
 * Migration: Create messages table
 *
 * Stores individual messages within conversations.
 */

exports.up = (pgm) => {
  // Create messages table
  pgm.createTable("messages", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    conversation_id: {
      type: "uuid",
      notNull: true,
      references: "conversations(id)",
      onDelete: "CASCADE",
    },
    role: {
      type: "varchar(50)",
      notNull: true,
      comment: "user, assistant, or system",
    },
    content: {
      type: "text",
      notNull: true,
    },
    brain_context: {
      type: "jsonb",
      default: "[]",
      comment: "Retrieved notes/context from Brain Cloud",
    },
    tokens: {
      type: "integer",
      comment: "Token count for this message",
    },
    metadata: {
      type: "jsonb",
      default: "{}",
      comment: "Additional metadata (model, temperature, etc.)",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  // Create indexes
  pgm.createIndex("messages", "conversation_id");
  pgm.createIndex("messages", "role");
  pgm.createIndex("messages", "created_at");
  pgm.createIndex("messages", ["conversation_id", "created_at"]);

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see messages from their conversations
    CREATE POLICY messages_conversation_isolation ON messages
      FOR ALL
      USING (
        conversation_id IN (
          SELECT id FROM conversations
          WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
            AND user_id = current_setting('app.current_user_id')::uuid
        )
      );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable("messages", { cascade: true });
};
