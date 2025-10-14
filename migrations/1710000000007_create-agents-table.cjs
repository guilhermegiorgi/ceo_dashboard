/**
 * Migration: Create agents table
 *
 * Stores AI agent configurations and settings.
 */

exports.up = (pgm) => {
  // Create agents table
  pgm.createTable("agents", {
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
    },
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    description: {
      type: "text",
    },
    agent_type: {
      type: "varchar(100)",
      notNull: true,
      comment: "research, code-review, data-analysis, etc.",
    },
    system_prompt: {
      type: "text",
    },
    configuration: {
      type: "jsonb",
      default: "{}",
      comment: "Model, temperature, max_tokens, etc.",
    },
    brain_context_enabled: {
      type: "boolean",
      default: true,
    },
    brain_context_settings: {
      type: "jsonb",
      default: "{}",
    },
    status: {
      type: "varchar(50)",
      default: "active",
      comment: "active, paused, archived",
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
  pgm.createIndex("agents", "tenant_id");
  pgm.createIndex("agents", "user_id");
  pgm.createIndex("agents", "project_id");
  pgm.createIndex("agents", ["tenant_id", "user_id"]);
  pgm.createIndex("agents", "agent_type");
  pgm.createIndex("agents", "status");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see their own agents
    CREATE POLICY agents_user_isolation ON agents
      FOR ALL
      USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND user_id = current_setting('app.current_user_id')::uuid
      );
  `);

  // Create trigger for updated_at
  pgm.createTrigger("agents", "update_agents_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("agents", { cascade: true });
};
