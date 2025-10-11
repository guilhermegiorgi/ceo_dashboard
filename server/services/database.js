import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

let db = null;

export async function initializeDatabase() {
  const dbPath = process.env.DATABASE_URL || './data/dashboard.db';
  
  await mkdir(dirname(dbPath), { recursive: true });
  
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        return reject(err);
      }
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
}

async function createTables() {
  const run = promisify(db.run.bind(db));

  await run(`
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT,
      description TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      urgency TEXT,
      connectedElements TEXT,
      suggestedAction TEXT,
      potentialImpact TEXT,
      source TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  await run(`
    CREATE TABLE IF NOT EXISTS feedback_actions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL,
      obsidianNote TEXT,
      relatedProject TEXT,
      impact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- Tabelas para o Sistema de Agentes de Inteligência ---

  await run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      schedule TEXT,
      api_key TEXT,
      status TEXT NOT NULL DEFAULT 'inactive',
      config_json TEXT,
      last_run_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      status TEXT NOT NULL,
      log TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS monitored_keywords (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL UNIQUE,
      source_note TEXT,
      type TEXT,
      last_searched DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS collected_data (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      keyword_id TEXT,
      url TEXT NOT NULL,
      title TEXT,
      summary TEXT,
      relevance_score REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES agent_runs (id) ON DELETE SET NULL,
      FOREIGN KEY (keyword_id) REFERENCES monitored_keywords (id) ON DELETE SET NULL
    )
  `);

  console.log('Database tables created successfully');
  await seedFeedbackActions();
}

function seedFeedbackActions() {
  const actions = [
    {
      id: '1',
      type: 'decision',
      title: 'Market Opportunity - AI Healthcare Tools',
      description: 'Created action plan and assigned tasks to AI Product Launch project',
      timestamp: '2 minutes ago',
      status: 'completed',
      obsidianNote: 'Decision Log - Market Opportunity AI Healthcare.md',
      relatedProject: 'AI Product Launch',
      impact: 'High - Strategic pivot approved'
    },
    {
      id: '2',
      type: 'insight_validation',
      title: 'Team Performance Optimization',
      description: 'Validated resource reallocation recommendation through team lead consultation',
      timestamp: '15 minutes ago',
      status: 'processing',
      obsidianNote: 'Insight Validation - Team Performance.md',
      relatedProject: 'Infrastructure Upgrade',
      impact: 'Medium - Process improvement identified'
    },
    {
      id: '3',
      type: 'learning_captured',
      title: 'Cross-Domain Pattern Discovery',
      description: 'Documented synergy between trading algorithms and agricultural optimization',
      timestamp: '1 hour ago',
      status: 'completed',
      obsidianNote: 'Learning - Cross Domain Patterns.md',
      impact: 'High - New market vertical identified'
    }
  ];

  const insert = db.prepare(`INSERT OR IGNORE INTO feedback_actions (id, type, title, description, timestamp, status, obsidianNote, relatedProject, impact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  actions.forEach(action => {
    insert.run(action.id, action.type, action.title, action.description, action.timestamp, action.status, action.obsidianNote, action.relatedProject, action.impact);
  });
  insert.finalize();
  console.log('Feedback actions seeded.');
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

let dbGet, dbAll, dbRun;

function ensureDbHelpers() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  if (!dbGet) {
    dbGet = promisify(db.get.bind(db));
    dbAll = promisify(db.all.bind(db));
    dbRun = promisify(db.run.bind(db));
  }
}

export { db, dbGet, dbAll, dbRun, ensureDbHelpers };