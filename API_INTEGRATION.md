# API Integration Guide

## Overview

This document outlines the API integrations required for the GG.AI Labs CEO Dashboard to function with real data sources and AI services.

## Required Integrations

### 1. Obsidian Local REST API

#### Setup Requirements
```bash
# Install Obsidian Local REST API Plugin
# Available at: https://github.com/coddingtonbear/obsidian-local-rest-api
```

#### Configuration
```typescript
// Environment Variables
VITE_OBSIDIAN_API_URL=http://localhost:27123
VITE_OBSIDIAN_API_KEY=your_obsidian_api_key
VITE_OBSIDIAN_VAULT_NAME=your_vault_name
```

#### API Endpoints

**Get Vault Information**
```typescript
GET /vault/
Headers: {
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

**Search Notes**
```typescript
GET /search/?query={searchTerm}
Headers: {
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

**Get Note Content**
```typescript
GET /vault/{notePath}
Headers: {
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

**Get Note Links**
```typescript
GET /vault/{notePath}/links/
Headers: {
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

#### Implementation Example
```typescript
// src/services/obsidianApi.ts
class ObsidianAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_OBSIDIAN_API_URL;
    this.apiKey = import.meta.env.VITE_OBSIDIAN_API_KEY;
  }

  async searchNotes(query: string) {
    const response = await fetch(`${this.baseUrl}/search/?query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  async getNoteContent(notePath: string) {
    const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(notePath)}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
}
```

### 2. Custom Embeddings/Transformers API

#### Purpose
- Process Obsidian note content
- Generate embeddings for semantic search
- Provide AI-powered content analysis

#### Required Endpoints

**Generate Embeddings**
```typescript
POST /api/embeddings
Content-Type: application/json
{
  "text": "content to embed",
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}

Response:
{
  "embeddings": [0.1, 0.2, ...],
  "model": "sentence-transformers/all-MiniLM-L6-v2",
  "dimensions": 384
}
```

**Semantic Search**
```typescript
POST /api/search/semantic
Content-Type: application/json
{
  "query": "search query",
  "limit": 10,
  "threshold": 0.7
}

Response:
{
  "results": [
    {
      "content": "matching content",
      "score": 0.85,
      "metadata": {...}
    }
  ]
}
```

**Content Analysis**
```typescript
POST /api/analyze
Content-Type: application/json
{
  "content": "text to analyze",
  "analysis_types": ["sentiment", "topics", "entities"]
}

Response:
{
  "sentiment": {
    "score": 0.8,
    "label": "positive"
  },
  "topics": ["business", "strategy"],
  "entities": [
    {
      "text": "Q1 2024",
      "type": "DATE"
    }
  ]
}
```

#### Implementation Example
```typescript
// src/services/embeddingsApi.ts
class EmbeddingsAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_EMBEDDINGS_API_URL;
    this.apiKey = import.meta.env.VITE_EMBEDDINGS_API_KEY;
  }

  async generateEmbeddings(text: string) {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model: 'sentence-transformers/all-MiniLM-L6-v2'
      })
    });
    return response.json();
  }

  async semanticSearch(query: string, limit = 10) {
    const response = await fetch(`${this.baseUrl}/api/search/semantic`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, limit })
    });
    return response.json();
  }
}
```

### 3. Model Context Protocol (MCP) Integration

#### Purpose
- Connect with AI agents and models
- Provide context-aware AI services
- Enable multi-agent collaboration

#### MCP Server Setup
```typescript
// Environment Variables
VITE_MCP_ENDPOINT=ws://localhost:8080/mcp
VITE_MCP_API_KEY=your_mcp_key
```

#### MCP Client Implementation
```typescript
// src/services/mcpClient.ts
class MCPClient {
  private ws: WebSocket | null = null;
  private endpoint: string;
  private apiKey: string;

  constructor() {
    this.endpoint = import.meta.env.VITE_MCP_ENDPOINT;
    this.apiKey = import.meta.env.VITE_MCP_API_KEY;
  }

  connect() {
    this.ws = new WebSocket(this.endpoint);
    
    this.ws.onopen = () => {
      this.authenticate();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }

  async queryAgent(agentId: string, query: string) {
    const message = {
      type: 'query',
      agentId,
      query,
      timestamp: Date.now()
    };

    this.ws?.send(JSON.stringify(message));
  }
}
```

### 4. Real-time Data Integration

#### WebSocket Connections
```typescript
// src/services/realtimeService.ts
class RealtimeService {
  private connections: Map<string, WebSocket> = new Map();

  connectToObsidian() {
    const ws = new WebSocket('ws://localhost:27124/live');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleObsidianUpdate(data);
    };

    this.connections.set('obsidian', ws);
  }

  connectToMCP() {
    const ws = new WebSocket(import.meta.env.VITE_MCP_ENDPOINT);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMCPUpdate(data);
    };

    this.connections.set('mcp', ws);
  }
}
```

## Data Models

### Obsidian Note Model
```typescript
interface ObsidianNote {
  path: string;
  name: string;
  content: string;
  frontmatter: Record<string, any>;
  links: string[];
  backlinks: string[];
  tags: string[];
  created: string;
  modified: string;
}
```

### AI Insight Model
```typescript
interface AIInsight {
  id: string;
  title: string;
  content: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  source: 'obsidian' | 'mcp' | 'embeddings';
  actionable: boolean;
  timestamp: string;
  metadata: Record<string, any>;
}
```

### MCP Agent Model
```typescript
interface MCPAgent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'processing' | 'error';
  capabilities: string[];
  lastResponse: string;
  metrics: {
    queries: number;
    successRate: number;
    avgResponseTime: number;
  };
}
```

## Error Handling

### API Error Types
```typescript
enum APIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

interface APIError {
  type: APIErrorType;
  message: string;
  statusCode?: number;
  details?: any;
}
```

### Error Handling Strategy
```typescript
// src/utils/errorHandler.ts
class ErrorHandler {
  static handle(error: APIError) {
    switch (error.type) {
      case APIErrorType.NETWORK_ERROR:
        // Show offline indicator
        // Queue requests for retry
        break;
      case APIErrorType.AUTHENTICATION_ERROR:
        // Redirect to login
        // Clear stored tokens
        break;
      case APIErrorType.RATE_LIMIT_ERROR:
        // Implement exponential backoff
        // Show rate limit warning
        break;
      default:
        // Log error and show generic message
        console.error('API Error:', error);
    }
  }
}
```

## Testing Strategy

### API Mocking
```typescript
// src/mocks/apiMocks.ts
export const mockObsidianAPI = {
  searchNotes: jest.fn().mockResolvedValue({
    results: [
      {
        path: 'Strategy/Q1-2024.md',
        name: 'Q1 2024 Strategy',
        score: 0.95
      }
    ]
  }),
  
  getNoteContent: jest.fn().mockResolvedValue({
    content: '# Q1 2024 Strategy\n\nOur focus for Q1...',
    frontmatter: { tags: ['strategy', 'quarterly'] }
  })
};
```

### Integration Testing
```typescript
// src/tests/integration/obsidianIntegration.test.ts
describe('Obsidian Integration', () => {
  test('should fetch and display recent notes', async () => {
    // Mock API response
    // Render component
    // Assert UI updates correctly
  });

  test('should handle API errors gracefully', async () => {
    // Mock API error
    // Render component
    // Assert error state is displayed
  });
});
```

## Performance Optimization

### Caching Strategy
```typescript
// src/utils/cache.ts
class APICache {
  private cache = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }
}
```

### Request Debouncing
```typescript
// src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Security Considerations

### API Key Management
- Store API keys in environment variables
- Use different keys for development and production
- Implement key rotation strategy
- Monitor API key usage

### CORS Configuration
```typescript
// Required CORS headers for API servers
{
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

### Rate Limiting
- Implement client-side rate limiting
- Use exponential backoff for retries
- Monitor API usage patterns
- Set up alerts for unusual activity