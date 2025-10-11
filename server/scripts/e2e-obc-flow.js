#!/usr/bin/env node
/*
 Simple E2E sanity script for OBC integration.
 - Logs in (or registers) a test user
 - Requests weekly insights
 - Saves a test insight note
 - Fetches recent changes from OBC
*/

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BASE = process.env.DASHBOARD_BASE_URL || 'http://localhost:3001';
const email = process.env.TEST_EMAIL || 'test@example.com';
const password = process.env.TEST_PASSWORD || 'test1234';

async function loginOrRegister() {
  let token = null;
  try {
    const r = await fetch(`${BASE}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const j = await r.json();
    if (r.ok && j.token) return j.token;
  } catch {}
  // register
  const rr = await fetch(`${BASE}/api/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password, name:'Test' }) });
  if (!rr.ok) {
    console.error('Register failed', await rr.text());
  }
  const rl = await fetch(`${BASE}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
  const jl = await rl.json();
  if (!rl.ok) throw new Error(`Login failed ${rl.status} ${JSON.stringify(jl)}`);
  return jl.token;
}

async function main() {
  const token = await loginOrRegister();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  console.log('✅ Auth OK');

  // Weekly insights
  const ins = await fetch(`${BASE}/api/insights/weekly?cache=false&limit=5`, { headers });
  const insJ = await ins.json();
  console.log('🧠 Insights:', ins.status, Array.isArray(insJ.data) ? insJ.data.length : 'n/a');

  // Save a test insight note
  const ts = new Date().toISOString();
  const save = await fetch(`${BASE}/api/obsidian/save-insight`, { method:'POST', headers, body: JSON.stringify({ title: `E2E Insight ${ts}`, description: 'E2E test note from script.' }) });
  const saveJ = await save.json();
  console.log('📝 Save Insight:', save.status, saveJ.message || JSON.stringify(saveJ));

  // Recent changes
  const rc = await fetch(`${BASE}/api/vault/recent-changes?limit=5`, { headers });
  const rcJ = await rc.json();
  console.log('📜 Recent Changes:', rc.status, Array.isArray(rcJ?.data?.files) ? rcJ.data.files.length : 'n/a');
}

main().catch(err => { console.error('E2E error:', err); process.exit(1); });

