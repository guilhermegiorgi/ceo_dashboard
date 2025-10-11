#!/usr/bin/env node

/**
 * Script de configuração e sincronização do Vault Obsidian
 * Este script facilita a configuração inicial e manutenção do vault Git
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
const VAULT_GIT_REPO = process.env.OBSIDIAN_VAULT_GIT_REPO;

/**
 * Verifica se o vault existe e está configurado
 */
async function checkVaultSetup() {
  console.log('🔍 Verificando configuração do vault...\n');

  if (!VAULT_PATH) {
    console.error('❌ OBSIDIAN_VAULT_PATH não está definido no .env');
    process.exit(1);
  }

  if (!VAULT_GIT_REPO) {
    console.error('❌ OBSIDIAN_VAULT_GIT_REPO não está definido no .env');
    process.exit(1);
  }

  try {
    await fs.access(VAULT_PATH);
    console.log(`✅ Vault encontrado em: ${VAULT_PATH}`);
  } catch (error) {
    console.log(`⚠️  Vault não encontrado em: ${VAULT_PATH}`);
    console.log('📥 Clonando repositório...');

    try {
      // Cria diretório pai se não existir
      await fs.mkdir(path.dirname(VAULT_PATH), { recursive: true });

      // Clona o repositório
      execSync(`git clone ${VAULT_GIT_REPO} "${VAULT_PATH}"`, {
        stdio: 'inherit',
        cwd: path.dirname(VAULT_PATH)
      });

      console.log('✅ Vault clonado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao clonar vault:', error.message);
      process.exit(1);
    }
  }

  // Verifica se é um repositório Git válido
  try {
    execSync('git status', { cwd: VAULT_PATH, stdio: 'pipe' });
    console.log('✅ Repositório Git válido');
  } catch (error) {
    console.error('❌ Diretório não é um repositório Git válido');
    console.log('💡 Dica: Execute "git init" no diretório do vault se necessário');
    process.exit(1);
  }

  console.log('');
}

/**
 * Sincroniza o vault com o repositório remoto
 */
async function syncVault() {
  console.log('🔄 Sincronizando vault...\n');

  try {
    // Verifica status do repositório
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: VAULT_PATH });

    if (statusOutput.trim()) {
      console.log('📝 Há mudanças não commitadas. Commitando...');

      // Adiciona todas as mudanças
      await execAsync('git add .', { cwd: VAULT_PATH });

      // Commit com timestamp
      const timestamp = new Date().toISOString();
      await execAsync(`git commit -m "Auto-sync: ${timestamp}"`, { cwd: VAULT_PATH });

      console.log('✅ Mudanças commitadas');
    }

    // Pull das mudanças remotas
    console.log('📥 Baixando mudanças do repositório...');
    const { stdout: pullOutput } = await execAsync('git pull origin main', { cwd: VAULT_PATH });
    console.log('✅ Pull concluído:', pullOutput.trim());

    // Push das mudanças locais
    console.log('📤 Enviando mudanças para o repositório...');
    const { stdout: pushOutput } = await execAsync('git push origin main', { cwd: VAULT_PATH });
    console.log('✅ Push concluído:', pushOutput.trim());

  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    process.exit(1);
  }

  console.log('');
}

/**
 * Cria estrutura de pastas padrão se não existir
 */
async function createDefaultStructure() {
  console.log('🏗️  Verificando estrutura de pastas...\n');

  const defaultFolders = [
    'INSIGHTS DO VAULT',
    'PROJETOS',
    'NOTAS DIÁRIAS',
    'REFERÊNCIAS',
    'TEMPLATES'
  ];

  for (const folder of defaultFolders) {
    const folderPath = path.join(VAULT_PATH, folder);

    try {
      await fs.access(folderPath);
      console.log(`✅ Pasta existe: ${folder}`);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log(`📁 Pasta criada: ${folder}`);
    }
  }

  console.log('');
}

/**
 * Cria arquivo README se não existir
 */
async function createReadme() {
  const readmePath = path.join(VAULT_PATH, 'README.md');

  try {
    await fs.access(readmePath);
    console.log('✅ README.md já existe');
  } catch (error) {
    const readmeContent = `# ${path.basename(VAULT_PATH)}

Este é seu Segundo Cérebro Digital integrado ao CEO Dashboard.

## Estrutura

- **INSIGHTS DO VAULT**: Insights gerados automaticamente pela IA
- **PROJETOS**: Notas relacionadas a projetos ativos
- **NOTAS DIÁRIAS**: Diário pessoal e reflexões
- **REFERÊNCIAS**: Material de referência e pesquisa
- **TEMPLATES**: Templates para novos tipos de nota

## Como usar

1. **Insights Automáticos**: O CEO Dashboard analisa suas notas e gera insights estratégicos
2. **Sincronização**: Todas as mudanças são automaticamente sincronizadas via Git
3. **Backup**: O vault é automaticamente feito backup no repositório Git

## Configuração

Este vault está conectado ao CEO Dashboard através das seguintes configurações:
- Repositório Git: ${VAULT_GIT_REPO}
- Dashboard URL: http://localhost:5173

---

*Gerenciado automaticamente pelo CEO Dashboard*
`;

    await fs.writeFile(readmePath, readmeContent, 'utf-8');
    console.log('📄 README.md criado');
  }

  console.log('');
}

/**
 * Função principal
 */
async function main() {
  const command = process.argv[2];

  console.log('🚀 CEO Dashboard - Vault Setup\n');

  switch (command) {
    case 'setup':
      await checkVaultSetup();
      await createDefaultStructure();
      await createReadme();
      await syncVault();
      console.log('🎉 Setup completo! Vault configurado e sincronizado.');
      break;

    case 'sync':
      await checkVaultSetup();
      await syncVault();
      console.log('🎉 Sincronização concluída!');
      break;

    case 'status':
      await checkVaultSetup();
      console.log('📊 Status do vault:');
      try {
        const { stdout: statusOutput } = await execAsync('git status --short', { cwd: VAULT_PATH });
        console.log(statusOutput || 'Nenhuma mudança pendente');
      } catch (error) {
        console.error('Erro ao verificar status:', error.message);
      }
      break;

    default:
      console.log('📖 Uso:');
      console.log('  node vault-setup.js setup  - Configuração inicial completa');
      console.log('  node vault-setup.js sync   - Sincronizar com repositório');
      console.log('  node vault-setup.js status - Verificar status do vault');
      break;
  }
}

// Executa se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { checkVaultSetup, syncVault, createDefaultStructure, createReadme };
