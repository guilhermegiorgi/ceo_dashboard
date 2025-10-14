/**
 * Migration: Create users table
 *
 * Creates the users table with tenant association.
 * Each user belongs to a tenant and has role-based permissions.
 */

exports.up = (pgm) => {
  // Create users table
  pgm.createTable("users", {
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
    email: {
      type: "varchar(255)",
      notNull: true,
    },
    password_hash: {
      type: "text",
      notNull: true,
    },
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    role: {
      type: "varchar(50)",
      default: "member",
    },
    status: {
      type: "varchar(50)",
      default: "active",
    },
    last_login_at: {
      type: "timestamp",
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

  // Create unique constraint for email per tenant
  pgm.addConstraint("users", "users_tenant_email_unique", {
    unique: ["tenant_id", "email"],
  });

  // Create indexes
  pgm.createIndex("users", "tenant_id");
  pgm.createIndex("users", "email");
  pgm.createIndex("users", ["tenant_id", "email"]);
  pgm.createIndex("users", "status");
  pgm.createIndex("users", "created_at");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see users in their tenant
    CREATE POLICY users_tenant_isolation ON users
      FOR ALL
      USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
  `);

  // Create trigger for updated_at
  pgm.createTrigger("users", "update_users_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("users", { cascade: true });
};
