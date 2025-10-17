/**
 * Sandbox Executor Service
 * Permite executar código JavaScript/Node.js em sandbox isolado
 * Similar ao workbench remoto do Rube
 */

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

class SandboxExecutor {
  constructor() {
    this.sandboxDir = path.join(os.tmpdir(), 'ceo-dashboard-sandbox');
    this.ensureSandboxDir();
  }

  ensureSandboxDir() {
    if (!fs.existsSync(this.sandboxDir)) {
      fs.mkdirSync(this.sandboxDir, { recursive: true });
    }
  }

  async executeCode(code, timeout = 30000, language = 'javascript') {
    const executionId = uuidv4();
    const workDir = path.join(this.sandboxDir, executionId);

    try {
      fs.mkdirSync(workDir, { recursive: true });

      let result;
      if (language === 'javascript') {
        result = await this.executeJavaScript(code, workDir, timeout, executionId);
      } else if (language === 'python') {
        result = await this.executePython(code, workDir, timeout, executionId);
      } else if (language === 'bash') {
        result = await this.executeBash(code, workDir, timeout, executionId);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        executionId,
        error: error.message,
        stderr: error.stderr?.toString() || '',
        stdout: error.stdout?.toString() || ''
      };
    } finally {
      // Limpar sandbox
      this.cleanupSandbox(workDir);
    }
  }

  async executeJavaScript(code, workDir, timeout, executionId) {
    const scriptFile = path.join(workDir, 'script.js');

    // Wrapper para capturar output
    const wrappedCode = `
      const stdout = [];
      const stderr = [];
      const originalLog = console.log;
      const originalError = console.error;

      console.log = (...args) => {
        stdout.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
        originalLog(...args);
      };

      console.error = (...args) => {
        stderr.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
        originalError(...args);
      };

      try {
        (async () => {
          ${code}
        })().catch(err => {
          stderr.push(err.message);
        });
      } catch (err) {
        stderr.push(err.message);
      }
    `;

    fs.writeFileSync(scriptFile, wrappedCode);

    const result = spawnSync('node', [scriptFile, '--max-old-space-size=512'], {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      cwd: workDir,
      encoding: 'utf8'
    });

    return {
      success: result.status === 0 || result.status === null,
      executionId,
      stdout: result.stdout || '',
      stderr: result.stderr || result.error?.message || '',
      exitCode: result.status
    };
  }

  async executePython(code, workDir, timeout, executionId) {
    const scriptFile = path.join(workDir, 'script.py');
    fs.writeFileSync(scriptFile, code);

    const result = spawnSync('python3', [scriptFile], {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      cwd: workDir,
      encoding: 'utf8'
    });

    return {
      success: result.status === 0,
      executionId,
      stdout: result.stdout || '',
      stderr: result.stderr || result.error?.message || '',
      exitCode: result.status
    };
  }

  async executeBash(code, workDir, timeout, executionId) {
    const scriptFile = path.join(workDir, 'script.sh');
    fs.writeFileSync(scriptFile, code);
    fs.chmodSync(scriptFile, 0o755);

    const result = spawnSync('bash', [scriptFile], {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      cwd: workDir,
      shell: '/bin/bash',
      encoding: 'utf8'
    });

    return {
      success: result.status === 0,
      executionId,
      stdout: result.stdout || '',
      stderr: result.stderr || result.error?.message || '',
      exitCode: result.status
    };
  }

  cleanupSandbox(workDir) {
    try {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Erro ao limpar sandbox ${workDir}:`, error.message);
    }
  }

  async fileOperation(operation, params) {
    const filesDir = path.join(this.sandboxDir, 'files');
    fs.mkdirSync(filesDir, { recursive: true });

    const filePath = path.join(filesDir, params.filename || uuidv4());

    switch (operation) {
      case 'write':
        fs.writeFileSync(filePath, params.content);
        return { success: true, path: filePath };
      case 'read':
        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content };
      case 'list':
        const files = fs.readdirSync(filesDir);
        return { success: true, files };
      case 'delete':
        fs.unlinkSync(filePath);
        return { success: true };
      default:
        throw new Error(`Operação desconhecida: ${operation}`);
    }
  }
}

export default new SandboxExecutor();
