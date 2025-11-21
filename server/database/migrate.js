#!/usr/bin/env node
/**
 * Standalone Database Migration Script
 * Creates auth tables directly without using pg-pool
 */

import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function runMigration() {
    // Create a new pool with the DATABASE_URL
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log('🚀 Starting database migration...');
        console.log('📍 Database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);

        const sqlFile = join(__dirname, 'migrations', '001_auth_schema.sql');
        const sql = readFileSync(sqlFile, 'utf8');

        // Split by semicolon and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

        for (const statement of statements) {
            const preview = statement.substring(0, 60).replace(/\n/g, ' ');
            console.log(`Executing: ${preview}...`);
            await pool.query(statement);
            console.log('✅ Success');
        }

        console.log('\n✅ Migration completed successfully!');
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
