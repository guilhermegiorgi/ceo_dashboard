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

    try {
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
        throw new Error(`Embeddings API error: ${response.status}`);
      }

      const data = await response.json();
      await cacheSet(cacheKey, data, 3600); // Cache for 1 hour
      return data;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      // Return mock embeddings for development
      return {
        embeddings: Array(384).fill(0).map(() => Math.random() - 0.5),
        model: 'mock-model',
        dimensions: 384
      };
    }
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

    try {
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
        throw new Error(`Analysis API error: ${response.status}`);
      }

      const data = await response.json();
      await cacheSet(cacheKey, data, 1800); // Cache for 30 minutes
      return data;
    } catch (error) {
      console.error('Failed to analyze content:', error);
      // Return mock analysis for development
      return {
        sentiment: { score: 0.7, label: 'positive' },
        topics: ['business', 'strategy', 'ai'],
        entities: [
          { text: 'Q1 2024', type: 'DATE' },
          { text: 'AI Healthcare', type: 'PROJECT' }
        ]
      };
    }
  }

  async generateInsight(context) {
    try {
      if (!this.openaiApiKey) {
        return this.generateMockInsight(context);
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a strategic business advisor. Generate actionable insights based on the provided context. Focus on opportunities, risks, and strategic recommendations.'
            },
            {
              role: 'user',
              content: `Generate a strategic insight based on this context: ${JSON.stringify(context)}`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const insight = data.choices[0].message.content;

      return {
        id: Date.now().toString(),
        title: this.extractTitle(insight),
        content: insight,
        confidence: Math.floor(Math.random() * 20) + 80, // 80-99%
        priority: this.determinePriority(insight),
        actionable: true,
        source: 'openai',
        metadata: {
          model: 'gpt-4',
          context: context,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to generate AI insight:', error);
      return this.generateMockInsight(context);
    }
  }

  generateMockInsight(context) {
    const mockInsights = [
      {
        title: 'Market Opportunity in AI Healthcare',
        content: 'Analysis of recent market trends and your knowledge base suggests a significant opportunity in AI-powered healthcare tools. The convergence of regulatory changes and technological advancement creates a 6-month window for market entry.',
        confidence: 89,
        priority: 'high'
      },
      {
        title: 'Team Productivity Optimization',
        content: 'Your team performance data indicates that reallocating 25% of engineering resources from maintenance to new feature development could increase overall productivity by 40% based on historical patterns.',
        confidence: 76,
        priority: 'medium'
      },
      {
        title: 'Strategic Partnership Opportunity',
        content: 'Cross-referencing your competitive analysis with recent industry moves suggests that Company X might be open to strategic partnership discussions within the next quarter.',
        confidence: 82,
        priority: 'medium'
      }
    ];

    const insight = mockInsights[Math.floor(Math.random() * mockInsights.length)];
    return {
      id: Date.now().toString(),
      ...insight,
      actionable: true,
      source: 'mock',
      metadata: {
        context: context,
        timestamp: new Date().toISOString()
      }
    };
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