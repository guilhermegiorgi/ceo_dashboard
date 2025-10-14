/**
 * Migration: Create user_settings table
 *
 * Stores UI preferences and user-specific settings.
 */

exports.up = (pgm) => {
  // Create user_settings table
  pgm.createTable("user_settings", {
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
    theme: {
      type: "varchar(50)",
      default: "dark",
    },
    language: {
      type: "varchar(10)",
      default: "pt-BR",
    },
    notifications_enabled: {
      type: "boolean",
      default: true,
    },
    email_notifications: {
      type: "boolean",
      default: true,
    },
    default_project_id: {
      type: "uuid",
      references: "projects(id)",
      onDelete: "SET NULL",
    },
    sidebar_collapsed: {
      type: "boolean",
      default: false,
    },
    ui_preferences: {
      type: "jsonb",
      default: "{}",
      comment: "Additional UI preferences",
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

  // Create unique constraint for one setting per user
  pgm.addConstraint("user_settings", "user_settings_tenant_user_unique", {
    unique: ["tenant_id", "user_id"],
  });

  // Create indexes
  pgm.createIndex("user_settings", "tenant_id");
  pgm.createIndex("user_settings", "user_id");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see their own settings
    CREATE POLICY user_settings_user_isolation ON user_settings
      FOR ALL
      USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND user_id = current_setting('app.current_user_id')::uuid
      );
  `);

  // Create trigger for updated_at
  pgm.createTrigger("user_settings", "update_user_settings_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user_settings", { cascade: true });
};
