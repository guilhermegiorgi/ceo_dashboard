#!/usr/bin/env node
/**
 * Script to clear mock/seed data from database
 * 
 * Usage: node scripts/clear-mock-data.js [--dry-run]
 */

import { query } from '../server/database/pg-pool.js';
import dotenv from 'dotenv';

dotenv.config();

const dryRun = process.argv.includes('--dry-run');

async function clearMockData() {
  console.log('🧹 Limpando dados mockados do banco de dados...\n');
  
  if (dryRun) {
    console.log('⚠️  Modo DRY-RUN ativo - nenhum dado será removido\n');
  }

  try {
    // 1. Check and remove mock projects
    console.log('📊 Verificando projetos mockados...');
    const projectsCheck = await query(`
      SELECT id, name, created_at 
      FROM projects 
      WHERE name IN (
        'AI Strategy Project',
        'Product Launch',
        'Customer Analytics',
        'Infrastructure Upgrade'
      )
      OR name LIKE '%Sample%'
      OR name LIKE '%Test%'
      OR name LIKE '%Example%'
      ORDER BY created_at;
    `);
    
    if (projectsCheck.rows.length > 0) {
      console.log(`   Encontrados ${projectsCheck.rows.length} projetos mockados:`);
      projectsCheck.rows.forEach(row => {
        console.log(`   - ${row.name} (${row.id})`);
      });
      
      if (!dryRun) {
        await query(`
          DELETE FROM projects 
          WHERE name IN (
            'AI Strategy Project',
            'Product Launch',
            'Customer Analytics',
            'Infrastructure Upgrade'
          )
          OR name LIKE '%Sample%'
          OR name LIKE '%Test%'
          OR name LIKE '%Example%';
        `);
        console.log(`   ✅ ${projectsCheck.rows.length} projetos removidos\n`);
      }
    } else {
      console.log('   ✅ Nenhum projeto mockado encontrado\n');
    }

    // 2. Check and remove mock decisions
    console.log('🎯 Verificando decisões mockadas...');
    const decisionsCheck = await query(`
      SELECT id, title, created_at 
      FROM decisions 
      WHERE title LIKE '%Example%'
      OR title LIKE '%Sample%'
      OR title LIKE '%Test%'
      OR title IN (
        'Migrate to Microservices',
        'Adopt AI-First Strategy',
        'International Expansion'
      )
      ORDER BY created_at;
    `);
    
    if (decisionsCheck.rows.length > 0) {
      console.log(`   Encontradas ${decisionsCheck.rows.length} decisões mockadas:`);
      decisionsCheck.rows.forEach(row => {
        console.log(`   - ${row.title} (${row.id})`);
      });
      
      if (!dryRun) {
        await query(`
          DELETE FROM decisions 
          WHERE title LIKE '%Example%'
          OR title LIKE '%Sample%'
          OR title LIKE '%Test%'
          OR title IN (
            'Migrate to Microservices',
            'Adopt AI-First Strategy',
            'International Expansion'
          );
        `);
        console.log(`   ✅ ${decisionsCheck.rows.length} decisões removidas\n`);
      }
    } else {
      console.log('   ✅ Nenhuma decisão mockada encontrada\n');
    }

    // 3. Check and remove mock conversations
    console.log('💬 Verificando conversas mockadas...');
    const conversationsCheck = await query(`
      SELECT id, title, created_at 
      FROM conversations 
      WHERE title LIKE '%Sample%'
      OR title LIKE '%Test%'
      OR title LIKE '%Example%'
      ORDER BY created_at;
    `);
    
    if (conversationsCheck.rows.length > 0) {
      console.log(`   Encontradas ${conversationsCheck.rows.length} conversas mockadas:`);
      conversationsCheck.rows.forEach(row => {
        console.log(`   - ${row.title || 'Sem título'} (${row.id})`);
      });
      
      if (!dryRun) {
        await query(`
          DELETE FROM conversations 
          WHERE title LIKE '%Sample%'
          OR title LIKE '%Test%'
          OR title LIKE '%Example%';
        `);
        console.log(`   ✅ ${conversationsCheck.rows.length} conversas removidas\n`);
      }
    } else {
      console.log('   ✅ Nenhuma conversa mockada encontrada\n');
    }

    // 4. Check mock users (but don't delete - may be needed)
    console.log('👤 Verificando usuários de desenvolvimento...');
    const usersCheck = await query(`
      SELECT id, email, name, created_at 
      FROM users 
      WHERE email = 'dev@ggai.dev'
      OR email LIKE '%@example.com'
      OR email LIKE '%test%'
      ORDER BY created_at;
    `);
    
    if (usersCheck.rows.length > 0) {
      console.log(`   Encontrados ${usersCheck.rows.length} usuários de dev/teste:`);
      usersCheck.rows.forEach(row => {
        console.log(`   - ${row.email} (${row.name})`);
      });
      console.log('   ⚠️  Usuários NÃO foram removidos (pode ser necessário para login)\n');
    } else {
      console.log('   ✅ Nenhum usuário de dev encontrado\n');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (dryRun) {
      console.log('✅ Verificação completa (DRY-RUN)');
      console.log('   Para remover os dados, execute sem --dry-run:');
      console.log('   node scripts/clear-mock-data.js');
    } else {
      console.log('✅ Limpeza completa!');
      console.log('   Dados mockados foram removidos do banco');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar dados mockados:', error);
    process.exit(1);
  }
}

// Run
clearMockData();
