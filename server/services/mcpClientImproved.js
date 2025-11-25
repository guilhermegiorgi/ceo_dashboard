/**
 * MCP Client Improved
 * Cliente HTTP para Obsidian Brain Cloud MCP com retry, caching e fallbacks
 */

import fetch from 'node-fetch';
import { EventEmitter } from 'events';

class MCPClientImproved extends EventEmitter {
  constructor(baseUrl = process.env.BRAINCLOUD_BASE_URL || 'https://obsidian-mcp.ggailabs.com') {
    super();
    this.baseUrl = baseUrl?.replace(/\/?$/, '');
    this.token = process.env.BRAINCLOUD_API_TOKEN;
    this.cache = new Map();
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true
    };
  }

  async call(toolName, toolInput = {}, options = {}) {
    const cacheKey = `${toolName}:${JSON.stringify(toolInput)}`;

    // Verificar cache
    if (options.useCache !== false && this.cache.has(cacheKey)) {
      this.emit('cache-hit', { toolName, cacheKey });
      return this.cache.get(cacheKey);
    }

    try {
      const result = await this.executeWithRetry(toolName, toolInput, options);

      // Cachear resultado se permitido
      if (options.cache !== false) {
        this.cache.set(cacheKey, result);
        if (options.cacheTime) {
          setTimeout(() => this.cache.delete(cacheKey), options.cacheTime);
        }
      }

      this.emit('tool-success', { toolName, result });
      return result;
    } catch (error) {
      this.emit('tool-error', { toolName, error: error.message });

      // Fallback para ferramenta local se disponível
      if (options.fallbackLocal) {
        return this.executeFallback(toolName, toolInput);
      }
      throw error;
    }
  }

  async executeWithRetry(toolName, toolInput, options, attempt = 0) {
    try {
      return await this.executeCall(toolName, toolInput);
    } catch (error) {
      if (attempt < this.retryConfig.maxRetries && this.isRetryable(error)) {
        const delay = this.retryConfig.exponentialBackoff 
          ? this.retryConfig.retryDelay * Math.pow(2, attempt)
          : this.retryConfig.retryDelay;

        this.emit('retry', { toolName, attempt, delay, error: error.message });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(toolName, toolInput, options, attempt + 1);
      }
      throw error;
    }
  }

  async executeCall(toolName, toolInput) {
    const url = `${this.baseUrl}/api/mcp/tools/${toolName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(toolInput),
      timeout: 30000
    });

    if (!response.ok) {
      const error = new Error(`MCP Request failed: ${response.status}`);
      error.status = response.status;
      error.statusText = response.statusText;
      throw error;
    }

    return await response.json();
  }

  isRetryable(error) {
    if (error.status) {
      return error.status >= 500 || error.status === 408 || error.status === 429;
    }
    return error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
  }

  async streamCall(toolName, toolInput, onChunk) {
    const url = `${this.baseUrl}/api/mcp/tools/${toolName}/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(toolInput)
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.status}`);
    }

    const body = response.body;
    if (!body) {
      throw new Error("Stream failed: empty body");
    }

    const decoder = new TextDecoder();

    const processChunk = (chunk) => {
      const text =
        typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
      onChunk(text);
    };

    if (typeof body.getReader === "function") {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) processChunk(value);
        }
      } finally {
        reader.releaseLock?.();
      }
    } else if (typeof body[Symbol.asyncIterator] === "function") {
      for await (const chunk of body) {
        if (chunk) processChunk(chunk);
      }
    } else {
      throw new Error("Stream failed: body is not readable");
    }
  }

  clearCache() {
    this.cache.clear();
    this.emit('cache-cleared');
  }

  executeFallback(toolName, toolInput) {
    // Implementar fallbacks locais para ferramentas mais usadas
    switch (toolName) {
      case 'mcp_list_files':
        return { files: [], error: 'Fallback: Brain Cloud indisponível' };
      case 'mcp_semantic_search':
        return { results: [], error: 'Fallback: Busca semântica indisponível' };
      default:
        throw new Error(`Nenhum fallback disponível para ${toolName}`);
    }
  }
}

const mcpClientImproved = new MCPClientImproved();

export { MCPClientImproved };
export default mcpClientImproved;
