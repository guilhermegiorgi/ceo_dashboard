import fetch from 'node-fetch';
import { cacheGet, cacheSet } from './cache.js';

class AIService {
  constructor() {
    this.embeddingsApiUrl = process.env.EMBEDDINGS_API_URL;
    this.embeddingsApiKey = process.env.EMBEDDINGS_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  async generateEmbeddings(text) {
    const cacheKey = `embeddings:${Buffer.from(text).toString('base64').substring(0, 50)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    if (!this.embeddingsApiUrl) {
      throw new Error('Embeddings API not configured');
    }

    const response = await fetch(`${this.embeddingsApiUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.embeddingsApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model: 'sentence-transformers/all-MiniLM-L6-v2'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embeddings API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    await cacheSet(cacheKey, data, 3600);
    return data;
  }

  async semanticSearch(query, limit = 10) {
    try {
      if (!this.embeddingsApiUrl) {
        throw new Error('Embeddings API not configured');
      }

      const response = await fetch(`${this.embeddingsApiUrl}/api/search/semantic`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.embeddingsApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, limit })
      });

      if (!response.ok) {
        throw new Error(`Semantic search API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to perform semantic search:', error);
      return { results: [] };
    }
  }

  async analyzeContent(content, analysisTypes = ['sentiment', 'topics', 'entities']) {
    const cacheKey = `analysis:${Buffer.from(content).toString('base64').substring(0, 50)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    if (!this.embeddingsApiUrl) {
      throw new Error('Analysis API not configured');
    }

    const response = await fetch(`${this.embeddingsApiUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.embeddingsApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        analysis_types: analysisTypes
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Analysis API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    await cacheSet(cacheKey, data, 1800);
    return data;
  }

  async generateInsight(context) {
    const prompt = [
      { role: 'system', content: 'Você é um advisor estratégico. Gere insights acionáveis com oportunidades, riscos e recomendações.' },
      { role: 'user', content: `Gere 1 insight estratégico baseado neste contexto: ${JSON.stringify(context)}` }
    ];
    const response = await fetch(`${process.env.COGNITO_API_URL || 'http://localhost:8000'}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.COGNITO_API_KEY || '' },
      body: JSON.stringify({ prompt, stream: false })
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Cognito insight error: ${response.status} ${err}`);
    }
    const data = await response.json();
    const txt = data.answer || '';
    return {
      id: Date.now().toString(),
      title: this.extractTitle(txt),
      content: txt,
      confidence: 85,
      priority: this.determinePriority(txt),
      actionable: true,
      source: 'cognito',
      metadata: { timestamp: new Date().toISOString() }
    };
  }

  generateMockInsight(context) {
    // Desabilitado: sem mocks. Exigir configuração apropriada do serviço Cognito.
    throw new Error('Mock insights desabilitado. Configure COGNITO_API_URL/COGNITO_API_KEY.');
  }

  extractTitle(content) {
    // Extract title from content (first line or first sentence)
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.length > 0 && firstLine.length < 100) {
      return firstLine.replace(/^#+\s*/, ''); // Remove markdown headers
    }
    
    // Fallback to first sentence
    const sentences = content.split('.');
    return sentences[0].substring(0, 80) + (sentences[0].length > 80 ? '...' : '');
  }

  determinePriority(content) {
    const highPriorityKeywords = ['urgent', 'critical', 'immediate', 'risk', 'opportunity', 'competitive'];
    const lowPriorityKeywords = ['consider', 'future', 'long-term', 'eventually'];
    
    const lowerContent = content.toLowerCase();
    
    if (highPriorityKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'high';
    }
    
    if (lowPriorityKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'low';
    }
    
    return 'medium';
  }
}

export async function generateAIInsights(context) {
  const aiService = new AIService();
  const insights = [];
  
  // Generate 2-3 insights based on context
  const insightCount = Math.floor(Math.random() * 2) + 2; // 2-3 insights
  
  for (let i = 0; i < insightCount; i++) {
    const insight = await aiService.generateInsight(context);
    insights.push(insight);
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return insights;
}

export default new AIService();
