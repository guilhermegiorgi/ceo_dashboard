/**
 * Migration: Create oauth_providers table
 *
 * Stores OAuth provider connections (Google, GitHub, etc).
 * Allows users to link multiple OAuth providers to their account.
 */

exports.up = (pgm) => {
  // Create oauth_providers table
  pgm.createTable("oauth_providers", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    provider: {
      type: "varchar(50)",
      notNull: true,
      comment: "google, github, microsoft, etc.",
    },
    provider_user_id: {
      type: "varchar(255)",
      notNull: true,
      comment: "User ID from the OAuth provider",
    },
    email: {
      type: "varchar(255)",
      notNull: true,
    },
    display_name: {
      type: "varchar(255)",
    },
    profile_picture: {
      type: "text",
      comment: "URL to profile picture from provider",
    },
    access_token: {
      type: "text",
      comment: "Encrypted OAuth access token",
    },
    refresh_token: {
      type: "text",
      comment: "Encrypted OAuth refresh token",
    },
    token_expires_at: {
      type: "timestamp",
    },
    raw_profile: {
      type: "jsonb",
      default: "{}",
      comment: "Full profile data from provider",
    },
    last_login_at: {
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

  // Create unique constraint: one provider per user
  pgm.addConstraint("oauth_providers", "oauth_providers_user_provider_unique", {
    unique: ["user_id", "provider"],
  });

  // Create unique constraint: provider_user_id must be unique per provider
  pgm.addConstraint("oauth_providers", "oauth_providers_provider_user_unique", {
    unique: ["provider", "provider_user_id"],
  });

  // Create indexes
  pgm.createIndex("oauth_providers", "user_id");
  pgm.createIndex("oauth_providers", "provider");
  pgm.createIndex("oauth_providers", ["provider", "provider_user_id"]);
  pgm.createIndex("oauth_providers", "email");

  // Enable Row Level Security
  pgm.sql(`
    ALTER TABLE oauth_providers ENABLE ROW LEVEL SECURITY;
  `);

  // Create RLS policies
  pgm.sql(`
    -- Users can only see their own OAuth connections
    CREATE POLICY oauth_providers_user_isolation ON oauth_providers
      FOR ALL
      USING (
        user_id = current_setting('app.current_user_id')::uuid
      );
  `);

  // Create trigger for updated_at
  pgm.createTrigger("oauth_providers", "update_oauth_providers_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("oauth_providers", { cascade: true });
};
