/**
 * Migration: Create tenants table
 *
 * Creates the core tenants table for multi-tenant architecture.
 * Each tenant represents an organization with its own isolated data.
 */

exports.up = (pgm) => {
  // Create tenants table
  pgm.createTable("tenants", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    slug: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },
    plan: {
      type: "varchar(50)",
      default: "free",
    },
    status: {
      type: "varchar(50)",
      default: "active",
    },
    brain_cloud_enabled: {
      type: "boolean",
      default: true,
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
  pgm.createIndex("tenants", "slug");
  pgm.createIndex("tenants", "status");
  pgm.createIndex("tenants", "created_at");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
  `);

  // Create updated_at trigger function
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger for updated_at
  pgm.createTrigger("tenants", "update_tenants_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("tenants", { cascade: true });
  pgm.sql("DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;");
};
