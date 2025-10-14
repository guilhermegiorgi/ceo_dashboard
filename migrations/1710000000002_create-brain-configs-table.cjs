/**
 * Migration: Create brain_configs table
 *
 * Stores per-user Obsidian Brain Cloud configurations.
 * Each user can have their own vault connection settings.
 */

exports.up = (pgm) => {
  // Create brain_configs table
  pgm.createTable("brain_configs", {
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
    vault_path: {
      type: "text",
      notNull: true,
    },
    mcp_server_url: {
      type: "text",
    },
    mcp_api_key_encrypted: {
      type: "text",
    },
    settings: {
      type: "jsonb",
      default: "{}",
      comment: "Additional settings like filters, search preferences, etc.",
    },
    is_active: {
      type: "boolean",
      default: true,
    },
    last_sync_at: {
      type: "timestamp",
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

  // Create unique constraint for one config per user per tenant
  pgm.addConstraint("brain_configs", "brain_configs_tenant_user_unique", {
    unique: ["tenant_id", "user_id"],
  });

  // Create indexes
  pgm.createIndex("brain_configs", "tenant_id");
  pgm.createIndex("brain_configs", "user_id");
  pgm.createIndex("brain_configs", ["tenant_id", "user_id"]);
  pgm.createIndex("brain_configs", "is_active");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE brain_configs ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see their own brain configs
    CREATE POLICY brain_configs_user_isolation ON brain_configs
      FOR ALL
      USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND user_id = current_setting('app.current_user_id')::uuid
      );
  `);

  // Create trigger for updated_at
  pgm.createTrigger("brain_configs", "update_brain_configs_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("brain_configs", { cascade: true });
};
