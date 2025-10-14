/**
 * Migration: Create workflows table
 *
 * Workflow automation with triggers and actions.
 * Inspired by Vectal.ai's workflow builder.
 */

exports.up = (pgm) => {
  // Create workflows table
  pgm.createTable("workflows", {
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
    trigger_type: {
      type: "varchar(100)",
      notNull: true,
      comment: "event, schedule, manual, webhook",
    },
    trigger_config: {
      type: "jsonb",
      default: "{}",
      comment: "Configuration for the trigger (event name, cron, etc.)",
    },
    actions: {
      type: "jsonb",
      default: "[]",
      comment: "List of actions to execute",
    },
    conditions: {
      type: "jsonb",
      default: "[]",
      comment: "Optional conditions to check before execution",
    },
    is_enabled: {
      type: "boolean",
      default: true,
    },
    status: {
      type: "varchar(50)",
      default: "active",
      comment: "active, paused, archived",
    },
    last_run_at: {
      type: "timestamp",
    },
    last_run_status: {
      type: "varchar(50)",
      comment: "success, failed, skipped",
    },
    run_count: {
      type: "integer",
      default: 0,
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
  pgm.createIndex("workflows", "tenant_id");
  pgm.createIndex("workflows", "user_id");
  pgm.createIndex("workflows", "project_id");
  pgm.createIndex("workflows", ["tenant_id", "user_id"]);
  pgm.createIndex("workflows", "trigger_type");
  pgm.createIndex("workflows", "is_enabled");
  pgm.createIndex("workflows", "status");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see their own workflows
    CREATE POLICY workflows_user_isolation ON workflows
      FOR ALL
      USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND user_id = current_setting('app.current_user_id')::uuid
      );
  `);

  // Create trigger for updated_at
  pgm.createTrigger("workflows", "update_workflows_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("workflows", { cascade: true });
};
