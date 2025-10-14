/**
 * Migration: Create agent_runs table
 *
 * Stores execution history of agent runs.
 */

exports.up = (pgm) => {
  // Create agent_runs table
  pgm.createTable("agent_runs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    agent_id: {
      type: "uuid",
      notNull: true,
      references: "agents(id)",
      onDelete: "CASCADE",
    },
    status: {
      type: "varchar(50)",
      notNull: true,
      default: "pending",
      comment: "pending, running, completed, failed",
    },
    input: {
      type: "jsonb",
      default: "{}",
      comment: "Input parameters for the run",
    },
    output: {
      type: "jsonb",
      default: "{}",
      comment: "Output/results from the run",
    },
    error: {
      type: "text",
      comment: "Error message if failed",
    },
    tokens_used: {
      type: "integer",
    },
    duration_ms: {
      type: "integer",
      comment: "Run duration in milliseconds",
    },
    metadata: {
      type: "jsonb",
      default: "{}",
    },
    started_at: {
      type: "timestamp",
    },
    completed_at: {
      type: "timestamp",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  // Create indexes
  pgm.createIndex("agent_runs", "agent_id");
  pgm.createIndex("agent_runs", "status");
  pgm.createIndex("agent_runs", "created_at");
  pgm.createIndex("agent_runs", ["agent_id", "created_at"]);
  pgm.createIndex("agent_runs", ["agent_id", "status"]);

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see runs from their agents
    CREATE POLICY agent_runs_user_isolation ON agent_runs
      FOR ALL
      USING (
        agent_id IN (
          SELECT id FROM agents
          WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
            AND user_id = current_setting('app.current_user_id')::uuid
        )
      );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable("agent_runs", { cascade: true });
};
