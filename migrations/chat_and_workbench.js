/**
 * Migration: Create Chat and Workbench Tables
 * Adiciona suporte para chat melhorado e execução remota
 */

export async function up(db) {
  // Tabela de sessões de workbench
  await db.query(\`
    CREATE TABLE IF NOT EXISTS workbench_sessions (
      id UUID PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  \`);

  // Tabela de execuções no workbench
  await db.query(\`
    CREATE TABLE IF NOT EXISTS workbench_executions (
      id UUID PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES workbench_sessions(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      language VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL,
      result JSONB,
      duration INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  \`);

  // Tabela de conversas de chat
  await db.query(\`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id UUID PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
      workbench_session_id UUID REFERENCES workbench_sessions(id) ON DELETE SET NULL,
      context JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMP
    );
  \`);

  // Tabela de mensagens de chat
  await db.query(\`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      tools_used JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  \`);

  // Índices
  await db.query(\`CREATE INDEX idx_workbench_user ON workbench_sessions(user_id);\`);
  await db.query(\`CREATE INDEX idx_chat_user ON chat_conversations(user_id);\`);
  await db.query(\`CREATE INDEX idx_chat_messages ON chat_messages(conversation_id);\`);
}

export async function down(db) {
  await db.query(\`DROP TABLE IF EXISTS chat_messages;\`);
  await db.query(\`DROP TABLE IF EXISTS chat_conversations;\`);
  await db.query(\`DROP TABLE IF EXISTS workbench_executions;\`);
  await db.query(\`DROP TABLE IF EXISTS workbench_sessions;\`);
}
