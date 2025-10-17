/**
 * Remote Workbench Service
 * Gerencia execuções de código remotas com estado persistente
 * Implementa conceitos similares ao workbench do Rube
 */

import sandboxExecutor from './sandboxExecutor.js';
import { v4 as uuidv4 } from 'uuid';
import db from './database.js';

class RemoteWorkbench {
  constructor() {
    this.sessions = new Map();
    this.executionHistory = [];
    this.maxHistorySize = 1000;
  }

  async createSession(userId, agentId = null) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      agentId,
      createdAt: new Date(),
      state: {},
      variables: {},
      executions: [],
      maxExecutions: 50
    };

    this.sessions.set(sessionId, session);

    // Persistir em DB
    await db.query(
      \`INSERT INTO workbench_sessions (id, user_id, agent_id, data) 
       VALUES (\$1, \$2, \$3, \$4)\`,
      [sessionId, userId, agentId, JSON.stringify(session)]
    );

    return session;
  }

  async executeCode(sessionId, code, language = 'javascript', timeout = 30000) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(\`Sessão \${sessionId} não encontrada\`);
    }

    if (session.executions.length >= session.maxExecutions) {
      throw new Error(\`Limite de execuções (\${session.maxExecutions}) atingido\`);
    }

    const executionId = uuidv4();
    const execution = {
      id: executionId,
      sessionId,
      code,
      language,
      timestamp: new Date(),
      status: 'running'
    };

    try {
      // Injetar contexto da sessão no código
      const contextCode = this.injectSessionContext(code, session);

      // Executar
      const result = await sandboxExecutor.executeCode(contextCode, timeout, language);

      execution.status = result.success ? 'completed' : 'error';
      execution.result = result;
      execution.duration = Date.now() - execution.timestamp;

      // Atualizar estado da sessão
      if (language === 'javascript' && result.success) {
        session.state = this.extractState(result.stdout);
      }

      session.executions.push(execution);
      this.executionHistory.push(execution);

      if (this.executionHistory.length > this.maxHistorySize) {
        this.executionHistory.shift();
      }

      // Persistir execução
      await db.query(
        \`INSERT INTO workbench_executions 
         (id, session_id, code, language, status, result, duration) 
         VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7)\`,
        [executionId, sessionId, code, language, execution.status, 
         JSON.stringify(result), execution.duration]
      );

      return execution;
    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      session.executions.push(execution);
      throw error;
    }
  }

  injectSessionContext(code, session) {
    const contextVariables = Object.entries(session.variables)
      .map(([key, value]) => \`const \${key} = \${JSON.stringify(value)};\`)
      .join('\n');

    return \`\${contextVariables}\n\${code}\`;
  }

  extractState(stdout) {
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Ignorar parse errors
    }
    return {};
  }

  async setVariable(sessionId, key, value) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(\`Sessão \${sessionId} não encontrada\`);
    }
    session.variables[key] = value;
    return value;
  }

  async getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  async listExecutions(sessionId, limit = 10) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(\`Sessão \${sessionId} não encontrada\`);
    }
    return session.executions.slice(-limit).reverse();
  }

  async closeSession(sessionId) {
    this.sessions.delete(sessionId);
    // Persistir no DB que session foi fechada
    await db.query(
      \`UPDATE workbench_sessions SET closed_at = NOW() WHERE id = \$1\`,
      [sessionId]
    );
  }
}

export default new RemoteWorkbench();
