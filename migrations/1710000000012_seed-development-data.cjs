/**
 * Migration: Seed development data
 *
 * Creates initial tenant, user, and sample data for development.
 */

exports.up = async (pgm) => {
  // Only seed in development environment
  if (process.env.NODE_ENV === "production") {
    console.log("Skipping seed data in production");
    return;
  }

  // Create development tenant
  pgm.sql(`
    INSERT INTO tenants (id, name, slug, plan, status, brain_cloud_enabled)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'GG.AI Labs',
      'ggai-labs',
      'enterprise',
      'active',
      true
    )
    ON CONFLICT (slug) DO NOTHING;
  `);

  // Create development user (password: Dev@2025!)
  // Hash generated with bcryptjs, 10 rounds
  pgm.sql(`
    INSERT INTO users (id, tenant_id, email, password_hash, name, role, status)
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001',
      'dev@ggai.dev',
      '$2a$10$qXmU2OX4HMHegnwCLgpDIuQrZT.pZw3qj6/9uPNOsUX7FP5pO.uta',
      'Developer',
      'admin',
      'active'
    )
    ON CONFLICT (tenant_id, email) DO NOTHING;
  `);

  // Create brain config for dev user
  pgm.sql(`
    INSERT INTO brain_configs (
      tenant_id,
      user_id,
      vault_path,
      mcp_server_url,
      is_active,
      settings
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '/home/guilherme/Documentos/GG.AI/SEGUNDO_CEREBRO',
      'http://localhost:8000',
      true,
      '{"auto_sync": true, "semantic_search_enabled": true}'::jsonb
    )
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  `);

  // Create sample project
  pgm.sql(`
    INSERT INTO projects (
      id,
      tenant_id,
      user_id,
      name,
      description,
      system_prompt,
      brain_context_enabled,
      brain_directories,
      brain_tags,
      status,
      color,
      icon
    )
    VALUES (
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      'CEO Dashboard Development',
      'Desenvolvimento da plataforma de inteligência executiva',
      'Você é um assistente especializado em desenvolvimento de software e arquitetura de sistemas. Ajude com decisões técnicas e implementação.',
      true,
      ARRAY['1 - PROJETOS/CEO_DASHBOARD', '2 - AREAS/Desenvolvimento'],
      ARRAY['desenvolvimento', 'arquitetura', 'dashboard'],
      'active',
      'blue',
      'terminal'
    );
  `);

  // Create sample tasks
  pgm.sql(`
    INSERT INTO tasks (
      project_id,
      title,
      description,
      status,
      priority,
      ai_generated,
      tags
    )
    VALUES
      (
        '00000000-0000-0000-0000-000000000003',
        'Implementar autenticação JWT',
        'Criar middleware de autenticação com tokens JWT e refresh tokens',
        'in_progress',
        'high',
        false,
        ARRAY['backend', 'autenticação']
      ),
      (
        '00000000-0000-0000-0000-000000000003',
        'Conectar com Obsidian Brain Cloud',
        'Implementar MCP client para integração com o segundo cérebro',
        'pending',
        'high',
        false,
        ARRAY['backend', 'integração']
      ),
      (
        '00000000-0000-0000-0000-000000000003',
        'Criar tela de Projects',
        'Desenvolver interface para gerenciamento de projetos',
        'pending',
        'medium',
        false,
        ARRAY['frontend', 'ui']
      );
  `);

  // Create sample conversation
  pgm.sql(`
    INSERT INTO conversations (
      id,
      tenant_id,
      user_id,
      project_id,
      title,
      brain_context_enabled
    )
    VALUES (
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      'Arquitetura Multi-Tenant',
      true
    );
  `);

  // Create sample messages
  pgm.sql(`
    INSERT INTO messages (conversation_id, role, content)
    VALUES
      (
        '00000000-0000-0000-0000-000000000004',
        'user',
        'Como devemos implementar a arquitetura multi-tenant?'
      ),
      (
        '00000000-0000-0000-0000-000000000004',
        'assistant',
        'Para implementar a arquitetura multi-tenant, recomendo:\n\n1. **Row-Level Security (RLS)** no PostgreSQL para isolamento de dados\n2. **JWT tokens** com tenant_id e user_id no payload\n3. **Middleware** para configurar o contexto do tenant em cada request\n4. **Migrations** com políticas RLS para todas as tabelas\n\nVamos começar pela configuração do banco de dados e depois implementar os middlewares de autenticação.'
      );
  `);

  // Create user settings
  pgm.sql(`
    INSERT INTO user_settings (
      tenant_id,
      user_id,
      theme,
      language,
      sidebar_collapsed,
      default_project_id
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      'dark',
      'pt-BR',
      false,
      '00000000-0000-0000-0000-000000000003'
    )
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  `);

  console.log("✅ Development seed data created successfully");
};

exports.down = (pgm) => {
  // Clean up seed data
  pgm.sql(`
    DELETE FROM messages WHERE conversation_id = '00000000-0000-0000-0000-000000000004';
    DELETE FROM conversations WHERE id = '00000000-0000-0000-0000-000000000004';
    DELETE FROM tasks WHERE project_id = '00000000-0000-0000-0000-000000000003';
    DELETE FROM projects WHERE id = '00000000-0000-0000-0000-000000000003';
    DELETE FROM user_settings WHERE user_id = '00000000-0000-0000-0000-000000000002';
    DELETE FROM brain_configs WHERE user_id = '00000000-0000-0000-0000-000000000002';
    DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000002';
    DELETE FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001';
  `);
};
