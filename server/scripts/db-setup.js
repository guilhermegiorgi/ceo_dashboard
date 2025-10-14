#!/usr/bin/env node

/**
 * Database Setup Script
 *
 * Initializes PostgreSQL database and runs migrations.
 */

import { execSync } from "child_process";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

// Suporte para Supabase (DATABASE_URL) ou local
const DATABASE_URL = process.env.DATABASE_URL;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || "5432";
const DB_NAME = process.env.DB_NAME || "postgres"; // Supabase usa 'postgres' por padrão
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "postgres";

async function createDatabase() {
  // Se usando Supabase, pula a criação do banco (já existe)
  if (DATABASE_URL) {
    console.log(
      chalk.yellow(
        "\n⚠️  Usando DATABASE_URL (Supabase) - pulando criação de banco"
      )
    );
    console.log(
      chalk.gray("   Supabase já tem o banco 'postgres' configurado")
    );
    return;
  }

  console.log(chalk.blue("\n📦 Criando banco de dados..."));

  // Connect to postgres database to create our database
  const clientConfig = DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: DB_HOST,
        port: DB_PORT,
        database: "postgres",
        user: DB_USER,
        password: DB_PASSWORD,
      };

  const client = new Client(clientConfig);

  try {
    await client.connect();

    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );

    if (result.rows.length === 0) {
      await client.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(chalk.green(`✅ Banco de dados '${DB_NAME}' criado`));
    } else {
      console.log(chalk.yellow(`⚠️  Banco de dados '${DB_NAME}' já existe`));
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(
        chalk.red("❌ Erro: PostgreSQL não está rodando ou não está acessível")
      );
      console.error(
        chalk.yellow(
          "   Certifique-se de que o PostgreSQL está instalado e rodando"
        )
      );
      console.error(
        chalk.yellow(`   Tentando conectar em: ${DB_HOST}:${DB_PORT}`)
      );
    } else {
      console.error(
        chalk.red("❌ Erro ao criar banco de dados:"),
        error.message
      );
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function runMigrations() {
  console.log(chalk.blue("\n🔄 Executando migrations..."));

  try {
    execSync("npm run migrate:up", {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL:
          DATABASE_URL ||
          `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      },
    });
    console.log(chalk.green("✅ Migrations executadas com sucesso"));
  } catch (error) {
    console.error(chalk.red("❌ Erro ao executar migrations:"), error.message);
    process.exit(1);
  }
}

async function testConnection() {
  console.log(chalk.blue("\n🔌 Testando conexão..."));

  const clientConfig = DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: DB_HOST,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
      };

  const client = new Client(clientConfig);

  try {
    await client.connect();
    const result = await client.query("SELECT NOW() as current_time");
    console.log(
      chalk.green("✅ Conexão estabelecida:"),
      result.rows[0].current_time
    );

    // Check tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(chalk.blue("\n📋 Tabelas criadas:"));
    tables.rows.forEach((row) => {
      console.log(chalk.gray(`   - ${row.table_name}`));
    });
  } catch (error) {
    console.error(chalk.red("❌ Erro ao testar conexão:"), error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(chalk.bold.cyan("\n🚀 CEO Dashboard - Database Setup\n"));

  try {
    await createDatabase();
    await runMigrations();
    await testConnection();

    console.log(chalk.bold.green("\n✨ Setup concluído com sucesso!\n"));
    console.log(chalk.gray("Credenciais de desenvolvimento:"));
    console.log(chalk.gray(`  Email: dev@ggai.dev`));
    console.log(chalk.gray(`  Senha: Dev@2025!\n`));
  } catch (error) {
    console.error(chalk.red("\n❌ Setup falhou:"), error.message);
    process.exit(1);
  }
}

main();
