#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');
const serverDir = path.join(rootDir, 'server');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);

const log = {
  info: (msg) => console.log(chalk.blue(`[INFO] ${msg}`)),
  success: (msg) => console.log(chalk.green(`[SUCESSO] ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`[ATENÇÃO] ${msg}`)),
  error: (msg) => console.error(chalk.red(`[ERRO] ${msg}`)),
};

class SetupScript {
  constructor() {
    this.requiredDirs = [
      path.join(serverDir, 'logs'),
      path.join(serverDir, 'uploads'),
      path.join(serverDir, 'cache')
    ];
    
    this.requiredFiles = [
      path.join(serverDir, '.env')
    ];
    
    this.requiredCommands = {
      node: '--version',
      npm: '--version',
      redis: '--version'
    };
  }
  
  async run() {
    try {
      log.info('Iniciando configuração do servidor...');
      
      await this.checkNodeVersion();
      await this.checkDependencies();
      await this.checkDirectories();
      await this.checkEnvFile();
      await this.installDependencies();
      
      log.success('Configuração concluída com sucesso!');
      log.info('Para iniciar o servidor em modo de desenvolvimento:');
      console.log(chalk.cyan('  cd server && npm run dev\n'));
      
    } catch (error) {
      log.error(`Falha na configuração: ${error.message}`);
      process.exit(1);
    }
  }
  
  async checkNodeVersion() {
    const requiredVersion = '16.0.0';
    const nodeVersion = process.version.replace('v', '');
    
    if (this.versionCompare(nodeVersion, requiredVersion) < 0) {
      throw new Error(`Node.js versão ${requiredVersion} ou superior é necessária. Versão atual: ${nodeVersion}`);
    }
    
    log.success(`Node.js versão ${nodeVersion} detectada`);
  }
  
  async checkDependencies() {
    log.info('Verificando dependências do sistema...');
    
    for (const [cmd, arg] of Object.entries(this.requiredCommands)) {
      try {
        const version = execSync(`${cmd} ${arg}`, { encoding: 'utf8' }).trim();
        log.success(`${cmd} instalado: ${version}`);
      } catch (error) {
        log.warn(`${cmd} não encontrado. Certifique-se de que está instalado e no PATH.`);
      }
    }
  }
  
  async checkDirectories() {
    log.info('Verificando estrutura de diretórios...');
    
    for (const dir of this.requiredDirs) {
      try {
        await access(dir);
        log.success(`Diretório encontrado: ${dir}`);
      } catch (error) {
        log.warn(`Criando diretório: ${dir}`);
        await mkdir(dir, { recursive: true });
      }
    }
  }
  
  async checkEnvFile() {
    const envPath = path.join(serverDir, '.env');
    const envExamplePath = path.join(serverDir, '.env.example');
    
    try {
      await access(envPath);
      log.success('Arquivo .env encontrado');
      
      // Verifica se o .env está vazio
      const content = await readFile(envPath, 'utf8');
      if (!content.trim()) {
        throw new Error('O arquivo .env está vazio');
      }
      
    } catch (error) {
      log.warn('Criando arquivo .env a partir do exemplo...');
      
      try {
        const exampleContent = await readFile(envExamplePath, 'utf8');
        await writeFile(envPath, exampleContent);
        log.warn('Arquivo .env criado. Por favor, configure as variáveis de ambiente.');
      } catch (err) {
        throw new Error(`Falha ao criar .env: ${err.message}`);
      }
    }
  }
  
  async installDependencies() {
    log.info('Instalando dependências do Node.js...');
    
    try {
      // Verifica se o diretório node_modules existe
      await access(path.join(serverDir, 'node_modules'));
      log.success('Dependências já instaladas');
      return;
    } catch (error) {
      // Se não existir, instala as dependências
      log.warn('Instalando dependências com npm...');
      
      try {
        execSync('npm install', { 
          cwd: serverDir, 
          stdio: 'inherit',
          shell: true
        });
        
        log.success('Dependências instaladas com sucesso!');
      } catch (err) {
        throw new Error(`Falha ao instalar dependências: ${err.message}`);
      }
    }
  }
  
  versionCompare(v1, v2) {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }
}

// Executa o script
const setup = new SetupScript();
setup.run().catch(console.error);
