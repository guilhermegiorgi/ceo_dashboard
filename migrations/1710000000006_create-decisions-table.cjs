/**
 * Migration: Create decisions table
 *
 * Stores strategic decisions with context and outcomes.
 */

exports.up = (pgm) => {
  // Create decisions table
  pgm.createTable("decisions", {
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
    title: {
      type: "varchar(500)",
      notNull: true,
    },
    context: {
      type: "text",
      notNull: true,
    },
    decision: {
      type: "text",
      notNull: true,
    },
    rationale: {
      type: "text",
    },
    alternatives: {
      type: "jsonb",
      default: "[]",
      comment: "List of alternatives considered",
    },
    impact: {
      type: "varchar(50)",
      default: "medium",
      comment: "high, medium, or low",
    },
    status: {
      type: "varchar(50)",
      default: "active",
      comment: "active, implemented, reversed",
    },
    outcome: {
      type: "text",
      comment: "Actual outcome of the decision",
    },
    obsidian_note_path: {
      type: "text",
      comment: "Path to related Obsidian note",
    },
    tags: {
      type: "text[]",
      default: "{}",
    },
    metadata: {
      type: "jsonb",
      default: "{}",
    },
    decision_date: {
      type: "date",
      notNull: true,
    },
    review_date: {
      type: "date",
      comment: "When to review this decision",
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
  pgm.createIndex("decisions", "tenant_id");
  pgm.createIndex("decisions", "user_id");
  pgm.createIndex("decisions", "project_id");
  pgm.createIndex("decisions", ["tenant_id", "user_id"]);
  pgm.createIndex("decisions", "status");
  pgm.createIndex("decisions", "impact");
  pgm.createIndex("decisions", "decision_date");
  pgm.createIndex("decisions", "review_date");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see their own decisions
    CREATE POLICY decisions_user_isolation ON decisions
      FOR ALL
      USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND user_id = current_setting('app.current_user_id')::uuid
      );
  `);

  // Create trigger for updated_at
  pgm.createTrigger("decisions", "update_decisions_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("decisions", { cascade: true });
};
