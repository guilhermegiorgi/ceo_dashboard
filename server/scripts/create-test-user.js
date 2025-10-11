#!/usr/bin/env node

/**
 * Script para criar um usuário de teste
 * Execute: node server/scripts/create-test-user.js
 */

import authService from '../src/services/authService.js';

async function createTestUser() {
  try {
    console.log('🧪 Criando usuário de teste...\n');

    const testUser = {
      email: 'admin@ggai.com',
      password: 'admin123',
      name: 'Administrador GG.AI'
    };

    // Tenta registrar o usuário
    const user = await authService.register(testUser);
    console.log('✅ Usuário criado com sucesso!');
    console.log('📧 Email:', user.email);
    console.log('👤 Nome:', user.name);
    console.log('🆔 ID:', user.id);

    // Faz login para obter tokens
    console.log('\n🔐 Fazendo login para obter tokens...');
    const loginResult = await authService.login(testUser.email, testUser.password);

    console.log('✅ Login realizado com sucesso!');
    console.log('🔑 Token de acesso gerado');
    console.log('🔄 Refresh token gerado');

    console.log('\n📋 Credenciais de teste:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${testUser.email}`);
    console.log(`Senha: ${testUser.password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💡 Use essas credenciais para fazer login no dashboard.');
    console.log('🔗 URL: http://localhost:5173');

  } catch (error) {
    if (error.message === 'Este email já está em uso') {
      console.log('ℹ️  Usuário de teste já existe!');
      console.log('\n📋 Credenciais de teste:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email: admin@ggai.com');
      console.log('Senha: admin123');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.error('❌ Erro ao criar usuário de teste:', error.message);
      process.exit(1);
    }
  }
}

// Executa se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUser().catch(console.error);
}
