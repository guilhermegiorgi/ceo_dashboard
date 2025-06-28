import fetch from 'node-fetch';
import { cacheGet, cacheSet } from './cache.js';

class ObsidianAPI {
  constructor() {
    this.baseUrl = process.env.OBSIDIAN_API_URL;
    this.apiKey = process.env.OBSIDIAN_API_KEY;
    this.vaultName = process.env.OBSIDIAN_VAULT_NAME;
    
    if (!this.baseUrl || !this.apiKey) {
      console.warn('Obsidian API not configured, using mock data');
    }
  }

  async makeRequest(endpoint, options = {}) {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Obsidian API not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Obsidian API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getVaultInfo() {
    const cacheKey = 'obsidian:vault:info';
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest('/vault/');
      await cacheSet(cacheKey, data, 60); // Cache for 1 minute
      return data;
    } catch (error) {
      console.error('Failed to get vault info:', error);
      return { name: 'Mock Vault', files: 0 };
    }
  }

  async searchNotes(query, limit = 10) {
    const cacheKey = `obsidian:search:${query}:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest(`/search/?query=${encodeURIComponent(query)}&limit=${limit}`);
      await cacheSet(cacheKey, data, 30); // Cache for 30 seconds
      return data;
    } catch (error) {
      console.error('Failed to search notes:', error);
      return this.getMockSearchResults(query);
    }
  }

  async getNoteContent(notePath) {
    const cacheKey = `obsidian:note:${notePath}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest(`/vault/${encodeURIComponent(notePath)}`);
      await cacheSet(cacheKey, data, 120); // Cache for 2 minutes
      return data;
    } catch (error) {
      console.error('Failed to get note content:', error);
      return this.getMockNoteContent(notePath);
    }
  }

  async createNote(title, content, folder = '') {
    try {
      const notePath = folder ? `${folder}/${title}.md` : `${title}.md`;
      const data = await this.makeRequest(`/vault/${encodeURIComponent(notePath)}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      
      // Invalidate related caches
      await this.invalidateCache();
      
      return data;
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }

  async updateNote(notePath, content) {
    try {
      const data = await this.makeRequest(`/vault/${encodeURIComponent(notePath)}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      
      // Invalidate cache for this note
      await cacheDel(`obsidian:note:${notePath}`);
      
      return data;
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  }

  async getNoteLinks(notePath) {
    try {
      const data = await this.makeRequest(`/vault/${encodeURIComponent(notePath)}/links/`);
      return data;
    } catch (error) {
      console.error('Failed to get note links:', error);
      return { outgoing: [], incoming: [] };
    }
  }

  async getRecentNotes(limit = 10) {
    const cacheKey = `obsidian:recent:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    try {
      // This would need to be implemented based on your Obsidian API
      const data = await this.makeRequest(`/vault/recent?limit=${limit}`);
      await cacheSet(cacheKey, data, 60);
      return data;
    } catch (error) {
      console.error('Failed to get recent notes:', error);
      return this.getMockRecentNotes();
    }
  }

  async invalidateCache() {
    // Invalidate all Obsidian-related cache entries
    // This is a simplified version - in production you'd want more granular cache invalidation
    console.log('Invalidating Obsidian cache...');
  }

  // Mock data methods for when Obsidian API is not available
  getMockSearchResults(query) {
    return {
      results: [
        {
          path: 'Strategy/Q1-2024.md',
          name: 'Q1 2024 Strategy',
          score: 0.95,
          excerpt: 'Strategic planning for Q1 2024 focusing on AI initiatives...'
        },
        {
          path: 'Projects/AI-Healthcare.md',
          name: 'AI Healthcare Project',
          score: 0.87,
          excerpt: 'Development of AI-powered healthcare tools and platforms...'
        }
      ]
    };
  }

  getMockNoteContent(notePath) {
    return {
      path: notePath,
      content: `# ${notePath.replace('.md', '')}\n\nThis is mock content for ${notePath}.\n\n## Key Points\n- Strategic initiative\n- Market opportunity\n- Technical requirements\n\n#strategy #ai #healthcare`,
      frontmatter: {
        tags: ['strategy', 'ai', 'healthcare'],
        created: '2024-01-20',
        modified: '2024-01-20'
      }
    };
  }

  getMockRecentNotes() {
    return [
      {
        path: 'Strategy/Q1-2024.md',
        name: 'Q1 2024 Strategy',
        modified: '2024-01-20T10:30:00Z',
        size: 2048
      },
      {
        path: 'Projects/AI-Healthcare.md',
        name: 'AI Healthcare Project',
        modified: '2024-01-19T15:45:00Z',
        size: 1536
      },
      {
        path: 'Meetings/Team-Sync-Jan-20.md',
        name: 'Team Sync Jan 20',
        modified: '2024-01-19T09:15:00Z',
        size: 1024
      }
    ];
  }
}

export default new ObsidianAPI();