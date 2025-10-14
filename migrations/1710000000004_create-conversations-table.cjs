/**
 * Migration: Create conversations table
 *
 * Stores chat conversations with Brain Cloud integration.
 */

exports.up = (pgm) => {
  // Create conversations table
  pgm.createTable("conversations", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "tenants(id)",
      onDelete: "CASCADE",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    project_id: {
      type: "uuid",
      references: "projects(id)",
      onDelete: "SET NULL",
      comment: "Optional project association",
    },
    title: {
      type: "varchar(500)",
      notNull: true,
    },
    summary: {
      type: "text",
    },
    system_prompt: {
      type: "text",
      comment: "Custom system prompt for this conversation",
    },
    brain_context_enabled: {
      type: "boolean",
      default: true,
    },
    brain_context_settings: {
      type: "jsonb",
      default: "{}",
      comment: "Filters for brain context (directories, tags, etc.)",
    },
    metadata: {
      type: "jsonb",
      default: "{}",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  // Create indexes
  pgm.createIndex("conversations", "tenant_id");
  pgm.createIndex("conversations", "user_id");
  pgm.createIndex("conversations", "project_id");
  pgm.createIndex("conversations", ["tenant_id", "user_id"]);
  pgm.createIndex("conversations", "created_at");
  pgm.createIndex("conversations", "updated_at");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see their own conversations
    CREATE POLICY conversations_user_isolation ON conversations
      FOR ALL
      USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND user_id = current_setting('app.current_user_id')::uuid
      );
  `);

  // Create trigger for updated_at
  pgm.createTrigger("conversations", "update_conversations_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("conversations", { cascade: true });
};
