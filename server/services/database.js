import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

let db = null;

export async function initializeDatabase() {
  const dbPath = process.env.DATABASE_URL || './data/dashboard.db';
  
  // Ensure data directory exists
  await mkdir(dirname(dbPath), { recursive: true });
  
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
}

async function createTables() {
  const run = promisify(db.run.bind(db));
  
  // Insights table
  await run(`
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      priority TEXT NOT NULL,
      actionable BOOLEAN NOT NULL,
      source TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Decisions table
  await run(`
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      context TEXT NOT NULL,
      decision TEXT NOT NULL,
      rationale TEXT NOT NULL,
      expected_outcome TEXT NOT NULL,
      actual_outcome TEXT,
      confidence INTEGER NOT NULL,
      impact TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      created_date DATE NOT NULL,
      review_date DATE,
      tags TEXT,
      related_insights TEXT,
      lessons TEXT,
      would_do_again BOOLEAN,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Strategic sessions table
  await run(`
    CREATE TABLE IF NOT EXISTS strategic_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      suggested_duration INTEGER NOT NULL,
      participants TEXT NOT NULL,
      preparation_notes TEXT NOT NULL,
      expected_outcomes TEXT NOT NULL,
      priority TEXT NOT NULL,
      trigger_insight TEXT,
      scheduled_date DATE,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Knowledge nodes table
  await run(`
    CREATE TABLE IF NOT EXISTS knowledge_nodes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      connections TEXT NOT NULL,
      tags TEXT NOT NULL,
      last_modified DATE NOT NULL,
      importance INTEGER NOT NULL,
      obsidian_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Projects table
  await run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL,
      team_size INTEGER NOT NULL,
      budget TEXT NOT NULL,
      deadline DATE NOT NULL,
      priority TEXT NOT NULL,
      roi TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Feedback actions table
  await run(`
    CREATE TABLE IF NOT EXISTS feedback_actions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      obsidian_note TEXT,
      related_project TEXT,
      impact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Database tables created successfully');
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export const dbGet = promisify(db?.get?.bind(db));
export const dbAll = promisify(db?.all?.bind(db));
export const dbRun = promisify(db?.run?.bind(db));