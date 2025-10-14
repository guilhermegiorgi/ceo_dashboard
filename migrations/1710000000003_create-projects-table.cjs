/**
 * Migration: Create projects table
 *
 * Projects organize conversations, tasks, and workflows.
 * Inspired by Vectal.ai's project structure.
 */

exports.up = (pgm) => {
  // Create projects table
  pgm.createTable("projects", {
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
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    description: {
      type: "text",
    },
    system_prompt: {
      type: "text",
      comment: "Custom system prompt for AI interactions in this project",
    },
    brain_context_enabled: {
      type: "boolean",
      default: true,
    },
    brain_directories: {
      type: "text[]",
      default: "{}",
      comment: "Obsidian directories to include in context",
    },
    brain_tags: {
      type: "text[]",
      default: "{}",
      comment: "Tags to filter notes for context",
    },
    auto_task_generation: {
      type: "boolean",
      default: false,
      comment: "Enable AI-powered task generation",
    },
    status: {
      type: "varchar(50)",
      default: "active",
      comment: "active, archived, completed",
    },
    color: {
      type: "varchar(50)",
      comment: "UI color for the project",
    },
    icon: {
      type: "varchar(50)",
      comment: "Icon identifier for the project",
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
  pgm.createIndex("projects", "tenant_id");
  pgm.createIndex("projects", "user_id");
  pgm.createIndex("projects", ["tenant_id", "user_id"]);
  pgm.createIndex("projects", "status");
  pgm.createIndex("projects", "created_at");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see their own projects
    CREATE POLICY projects_user_isolation ON projects
      FOR ALL
      USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND user_id = current_setting('app.current_user_id')::uuid
      );
  `);

  // Create trigger for updated_at
  pgm.createTrigger("projects", "update_projects_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });

  // Update conversations table to add foreign key (already exists in schema)
  // This is handled by the conversations migration referencing projects
};

exports.down = (pgm) => {
  pgm.dropTable("projects", { cascade: true });
};
