import knex from 'knex';
import { knexSnakeCaseMappers } from 'objection';
import { logger } from '../utils/logger.js';
import config from './config.js';

/**
 * Configuração do Knex.js para acesso ao banco de dados
 */
const knexConfig = {
  client: config.database.client,
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl,
    // Configurações específicas para PostgreSQL
    ...(config.database.client === 'pg' && {
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      application_name: config.app.name,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 20,
    }),
  },
  pool: {
    min: config.database.pool.min,
    max: config.database.pool.max,
    // Configurações específicas de pool
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './database/migrations',
    loadExtensions: ['.js', '.ts'],
  },
  seeds: {
    directory: './database/seeds',
    loadExtensions: ['.js', '.ts'],
  },
  // Mapeia nomes de colunas camelCase para snake_case
  ...knexSnakeCaseMappers(),
  // Configuração de debug
  debug: config.database.debug,
  log: {
    warn(message) {
      logger.warn(`[Knex] ${message}`);
    },
    error(message) {
      logger.error(`[Knex] ${message}`);
    },
    deprecate(message) {
      logger.warn(`[Knex] Deprecation: ${message}`);
    },
    debug(message) {
      logger.debug(`[Knex] ${message}`);
    },
  },
};

// Cria a instância do Knex
const knexInstance = knex(knexConfig);

/**
 * Testa a conexão com o banco de dados
 * @returns {Promise<boolean>} Verdadeiro se a conexão for bem-sucedida
 */
async function testConnection() {
  try {
    await knexInstance.raw('SELECT 1');
    logger.info('Conexão com o banco de dados estabelecida com sucesso');
    return true;
  } catch (error) {
    logger.error('Falha ao conectar ao banco de dados:', {
      error: error.message,
      stack: error.stack,
      config: {
        ...knexConfig,
        connection: {
          ...knexConfig.connection,
          password: '***', // Não loga a senha real
        },
      },
    });
    throw error;
  }
}

/**
 * Executa migrações do banco de dados
 * @returns {Promise<void>}
 */
async function runMigrations() {
  try {
    logger.info('Executando migrações do banco de dados...');
    await knexInstance.migrate.latest();
    logger.info('Migrações do banco de dados concluídas com sucesso');
  } catch (error) {
    logger.error('Falha ao executar migrações do banco de dados:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Executa seeds do banco de dados
 * @returns {Promise<void>}
 */
async function runSeeds() {
  try {
    if (config.database.runSeeds) {
      logger.info('Executando seeds do banco de dados...');
      await knexInstance.seed.run();
      logger.info('Seeds do banco de dados concluídos com sucesso');
    }
  } catch (error) {
    logger.error('Falha ao executar seeds do banco de dados:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Fecha a conexão com o banco de dados
 * @returns {Promise<void>}
 */
async function closeConnection() {
  try {
    await knexInstance.destroy();
    logger.info('Conexão com o banco de dados encerrada');
  } catch (error) {
    logger.error('Erro ao encerrar conexão com o banco de dados:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Exporta a instância do Knex e funções auxiliares
export {
  knexInstance as db,
  testConnection,
  runMigrations,
  runSeeds,
  closeConnection,
};

export default knexInstance;
