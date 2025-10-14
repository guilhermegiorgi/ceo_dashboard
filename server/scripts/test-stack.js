#!/usr/bin/env node

/**
 * Script de Teste da Stack Completa
 *
 * Testa:
 * - Conexão com PostgreSQL
 * - Tabelas criadas
 * - Passport configurado
 * - Health endpoints
 */

import { query, closePool } from "../database/pg-pool.js";
import chalk from "chalk";
import fetch from "node-fetch";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";

console.log(chalk.bold.cyan("\n🧪 CEO Dashboard - Stack Test\n"));

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details = "") {
  testsRun++;
  if (passed) {
    testsPassed++;
    console.log(chalk.green("✓"), chalk.white(name));
    if (details) {
      console.log(chalk.gray(`  ${details}`));
    }
  } else {
    testsFailed++;
    console.log(chalk.red("✗"), chalk.white(name));
    if (details) {
      console.log(chalk.red(`  ${details}`));
    }
  }
}

// Test 1: PostgreSQL Connection
async function testDatabaseConnection() {
  console.log(chalk.blue("\n📊 Testando Conexão PostgreSQL..."));
  try {
    const result = await query(
      "SELECT NOW() as current_time, version() as pg_version"
    );
    const version = result.rows[0].pg_version.split(" ")[1];
    logTest("Conexão PostgreSQL estabelecida", true, `PostgreSQL ${version}`);
    return true;
  } catch (error) {
    logTest("Conexão PostgreSQL", false, error.message);
    return false;
  }
}

// Test 2: Check Tables
async function testTables() {
  console.log(chalk.blue("\n📋 Verificando Tabelas..."));
  const requiredTables = [
    "tenants",
    "users",
    "brain_configs",
    "projects",
    "tasks",
    "conversations",
    "messages",
    "decisions",
    "agents",
    "agent_runs",
    "workflows",
    "user_settings",
    "oauth_providers",
  ];

  try {
    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const existingTables = result.rows.map((row) => row.table_name);

    let allTablesExist = true;
    for (const table of requiredTables) {
      const exists = existingTables.includes(table);
      logTest(`Tabela "${table}"`, exists);
      if (!exists) allTablesExist = false;
    }

    return allTablesExist;
  } catch (error) {
    logTest("Verificação de tabelas", false, error.message);
    return false;
  }
}

// Test 3: Check Seed Data
async function testSeedData() {
  console.log(chalk.blue("\n🌱 Verificando Dados Seed..."));
  try {
    const result = await query(`
      SELECT
        (SELECT count(*) FROM tenants) as tenants,
        (SELECT count(*) FROM users) as users,
        (SELECT count(*) FROM projects) as projects
    `);

    const counts = result.rows[0];
    logTest(
      "Tenants cadastrados",
      counts.tenants > 0,
      `${counts.tenants} tenant(s)`
    );
    logTest(
      "Usuários cadastrados",
      counts.users > 0,
      `${counts.users} usuário(s)`
    );
    logTest(
      "Projetos cadastrados",
      counts.projects >= 0,
      `${counts.projects} projeto(s)`
    );

    return counts.tenants > 0 && counts.users > 0;
  } catch (error) {
    logTest("Verificação de seed data", false, error.message);
    return false;
  }
}

// Test 4: Health Endpoints
async function testHealthEndpoints() {
  console.log(chalk.blue("\n🏥 Testando Health Endpoints..."));

  // Test /api/health
  try {
    const response = await fetch(`${SERVER_URL}/api/health`);
    const data = await response.json();
    logTest(
      "GET /api/health",
      response.ok && data.status === "healthy",
      `Status: ${data.status}`
    );
  } catch (error) {
    logTest(
      "GET /api/health",
      false,
      `Servidor não está rodando: ${error.message}`
    );
  }

  // Test /api/health/db
  try {
    const response = await fetch(`${SERVER_URL}/api/health/db`);
    const data = await response.json();
    logTest(
      "GET /api/health/db",
      response.ok && data.status === "connected",
      `Response time: ${data.responseTime}`
    );
  } catch (error) {
    logTest("GET /api/health/db", false, error.message);
  }

  // Test /api/health/ready
  try {
    const response = await fetch(`${SERVER_URL}/api/health/ready`);
    const data = await response.json();
    logTest("GET /api/health/ready", response.ok && data.ready === true);
  } catch (error) {
    logTest("GET /api/health/ready", false, error.message);
  }

  // Test /api/health/live
  try {
    const response = await fetch(`${SERVER_URL}/api/health/live`);
    const data = await response.json();
    logTest("GET /api/health/live", response.ok && data.alive === true);
  } catch (error) {
    logTest("GET /api/health/live", false, error.message);
  }
}

// Test 5: Auth Endpoints
async function testAuthEndpoints() {
  console.log(chalk.blue("\n🔐 Testando Auth Endpoints..."));

  // Test POST /api/auth/login (deve falhar sem credenciais)
  try {
    const response = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid@test.com", password: "wrong" }),
    });
    logTest(
      "POST /api/auth/login (endpoint existe)",
      response.status === 401 || response.status === 400
    );
  } catch (error) {
    logTest("POST /api/auth/login", false, error.message);
  }

  // Test GET /api/auth/google (deve redirecionar)
  try {
    const response = await fetch(`${SERVER_URL}/api/auth/google`, {
      redirect: "manual",
    });
    logTest("GET /api/auth/google (OAuth endpoint)", response.status === 302);
  } catch (error) {
    logTest("GET /api/auth/google", false, error.message);
  }
}

// Main
async function main() {
  let dbConnected = false;

  try {
    // Database tests
    dbConnected = await testDatabaseConnection();

    if (dbConnected) {
      await testTables();
      await testSeedData();
    }

    // Server tests (require server to be running)
    await testHealthEndpoints();
    await testAuthEndpoints();

    // Summary
    console.log(chalk.bold.cyan("\n📊 Resumo dos Testes:\n"));
    console.log(chalk.white(`Total: ${testsRun}`));
    console.log(chalk.green(`Passou: ${testsPassed}`));
    console.log(chalk.red(`Falhou: ${testsFailed}`));

    const successRate = ((testsPassed / testsRun) * 100).toFixed(1);
    console.log(chalk.yellow(`\nTaxa de Sucesso: ${successRate}%\n`));

    if (testsFailed === 0) {
      console.log(chalk.bold.green("✅ Todos os testes passaram!\n"));
    } else {
      console.log(chalk.bold.red(`❌ ${testsFailed} teste(s) falharam.\n`));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("\n❌ Erro ao executar testes:"), error);
    process.exit(1);
  } finally {
    if (dbConnected) {
      await closePool();
    }
  }
}

main();
