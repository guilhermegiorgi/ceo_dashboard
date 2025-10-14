/**
 * PostgreSQL Connection Pool
 *
 * Centralized database connection management with Row-Level Security support.
 */

import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Create connection pool
// Suporte para DATABASE_URL (Supabase) ou variáveis individuais
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase requer SSL
      min: parseInt(process.env.DB_POOL_MIN || "2"),
      max: parseInt(process.env.DB_POOL_MAX || "10"),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Aumentado para Supabase
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "ceo_dashboard_dev",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      ssl:
        process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      min: parseInt(process.env.DB_POOL_MIN || "2"),
      max: parseInt(process.env.DB_POOL_MAX || "10"),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});

/**
 * Execute a query with optional tenant/user context for RLS
 *
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} context - Optional context for RLS
 * @param {string} context.tenantId - Tenant ID for RLS
 * @param {string} context.userId - User ID for RLS
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params, context = {}) {
  const client = await pool.connect();
  try {
    // Set RLS context if provided
    if (context.tenantId) {
      await client.query(
        `SET LOCAL app.current_tenant_id = '${context.tenantId}'`
      );
    }
    if (context.userId) {
      await client.query(`SET LOCAL app.current_user_id = '${context.userId}'`);
    }

    // Execute query
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with optional RLS context
 *
 * @param {Function} callback - Async function that receives the client
 * @param {Object} context - Optional context for RLS
 * @returns {Promise<any>} Transaction result
 */
export async function transaction(callback, context = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Set RLS context if provided
    if (context.tenantId) {
      await client.query(
        `SET LOCAL app.current_tenant_id = '${context.tenantId}'`
      );
    }
    if (context.userId) {
      await client.query(`SET LOCAL app.current_user_id = '${context.userId}'`);
    }

    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool (for advanced use cases)
 * Remember to call client.release() when done!
 *
 * @returns {Promise<Object>} PostgreSQL client
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Close the pool (for graceful shutdown)
 */
export async function closePool() {
  await pool.end();
}

export default {
  query,
  transaction,
  getClient,
  closePool,
  pool,
};
