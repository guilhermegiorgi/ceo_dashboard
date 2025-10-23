#!/usr/bin/env node
/**
 * Validação do setup - Verifica se tudo está configurado corretamente
 */

import dotenv from 'dotenv';
import { query } from '../server/database/pg-pool.js';

dotenv.config();

const checks = [];

console.log('🔍 Validando configuração do sistema...\n');

// 1. Check Google OAuth
console.log('1️⃣  Verificando Google OAuth...');
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && !googleClientId.includes('your-google-client-id')) {
  console.log('   ✅ GOOGLE_CLIENT_ID configurado');
  checks.push({ name: 'Google Client ID', status: true });
} else {
  console.log('   ❌ GOOGLE_CLIENT_ID não configurado');
  checks.push({ name: 'Google Client ID', status: false });
}

if (googleSecret && !googleSecret.includes('your-google-client-secret')) {
  console.log('   ✅ GOOGLE_CLIENT_SECRET configurado');
  checks.push({ name: 'Google Client Secret', status: true });
} else {
  console.log('   ❌ GOOGLE_CLIENT_SECRET não configurado');
  checks.push({ name: 'Google Client Secret', status: false });
}

// 2. Check Database
console.log('\n2️⃣  Verificando banco de dados...');
try {
  await query('SELECT NOW() as now');
  console.log('   ✅ Conexão com banco OK');
  checks.push({ name: 'Database Connection', status: true });
  
  const projectsCheck = await query('SELECT COUNT(*) as count FROM projects');
  console.log(`   ℹ️  Projetos no banco: ${projectsCheck.rows[0].count}`);
  
  const usersCheck = await query('SELECT COUNT(*) as count FROM users');
  console.log(`   ℹ️  Usuários no banco: ${usersCheck.rows[0].count}`);
} catch (error) {
  console.log('   ❌ Erro na conexão com banco:', error.message);
  checks.push({ name: 'Database Connection', status: false });
}

// 3. Check Brain Cloud
console.log('\n3️⃣  Verificando Brain Cloud...');
const brainCloudUrl = process.env.BRAINCLOUD_BASE_URL;
const brainCloudToken = process.env.BRAINCLOUD_API_TOKEN;

if (brainCloudUrl && brainCloudToken) {
  console.log('   ✅ Brain Cloud configurado');
  console.log(`   ℹ️  URL: ${brainCloudUrl}`);
  checks.push({ name: 'Brain Cloud Config', status: true });
} else {
  console.log('   ❌ Brain Cloud não configurado');
  checks.push({ name: 'Brain Cloud Config', status: false });
}

// 4. Check Security
console.log('\n4️⃣  Verificando segurança...');
const jwtSecret = process.env.JWT_SECRET;
const isDefaultSecret = jwtSecret?.includes('change-this');

if (!isDefaultSecret) {
  console.log('   ✅ JWT_SECRET configurado (não é padrão)');
  checks.push({ name: 'JWT Secret', status: true });
} else {
  console.log('   ⚠️  JWT_SECRET usando valor padrão (OK para dev)');
  checks.push({ name: 'JWT Secret', status: 'warning' });
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 RESUMO DA VALIDAÇÃO:\n');

const passed = checks.filter(c => c.status === true).length;
const failed = checks.filter(c => c.status === false).length;
const warnings = checks.filter(c => c.status === 'warning').length;

checks.forEach(check => {
  const icon = check.status === true ? '✅' : check.status === false ? '❌' : '⚠️';
  console.log(`${icon} ${check.name}`);
});

console.log(`\n📈 Score: ${passed}/${checks.length} configurações OK`);

if (failed > 0) {
  console.log('\n⚠️  Há configurações faltando. Veja acima.');
} else {
  console.log('\n🎉 Tudo configurado corretamente!');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(failed > 0 ? 1 : 0);
