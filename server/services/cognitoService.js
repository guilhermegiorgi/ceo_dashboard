import fetch from 'node-fetch';
import { cacheGet, cacheSet } from './cache.js';

const COGNITO_API_URL = process.env.COGNITO_API_URL || 'http://localhost:8000';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Envia uma consulta para a API do Cognito
 * @param {string} query - A consulta a ser enviada
 * @param {Object} options - Opções adicionais
 * @param {string} [options.sessionId] - ID da sessão para manter o contexto
 * @param {boolean} [options.stream=false] - Se deve retornar um stream
 * @param {boolean} [options.useCache=true] - Se deve usar cache
 * @returns {Promise<Object|ReadableStream>} Resposta do Cognito
 */
export const queryCognito = async (promptOrHistory, {
  sessionId = null,
  stream = false,
  useCache = true,
  provider = 'google', // Valor padrão
  model = null,
  apiKey = null,
  temperature = null
} = {}) => {
  // Determina a chave de cache com base no último prompt do usuário, se for um histórico
  const latestQuery = Array.isArray(promptOrHistory) 
    ? promptOrHistory[promptOrHistory.length - 1].content 
    : promptOrHistory;
  const cacheKey = `cognito:${sessionId || 'nosession'}:${Buffer.from(latestQuery).toString('base64')}`;
  
  // A chave de API para se autenticar com o serviço Cognito
  const cognitoApiKey = process.env.COGNITO_API_KEY;
  
  // Tenta obter do cache primeiro
  if (useCache && !stream) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      console.log('Retornando resposta do cache do Cognito');
      return JSON.parse(cached);
    }
  }

  try {
    console.log(`Enviando consulta para o Cognito...`);
    
    const response = await fetch(`${COGNITO_API_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': stream ? 'text/event-stream' : 'application/json',
        'X-API-Key': cognitoApiKey, // Usa a chave correta do Cognito
      },
      body: JSON.stringify({
        prompt: promptOrHistory,
        session_id: sessionId,
        stream,
        // Passa os parâmetros da IA para o serviço Cognito, que os repassará ao provedor final
        provider,
        model,
        apiKey: apiKey, // Esta é a chave do provedor de IA (Google/OpenAI)
        temperature,
        auto_retrieve: false 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API do Cognito: ${response.status} - ${errorText}`);
    }

    // Se for streaming, retorna o stream diretamente
    if (stream) {
      return response.body;
    }

    // Processa a resposta
    const rawText = await response.text();

    if (!rawText) {
        console.log('Recebida resposta vazia da API do Cognito.');
        return { answer: '[]', confidence: 0, sources: [] }; // Retorna um objeto de resposta padrão
    }

    let data;

    try {
      // Tenta parsear diretamente
      data = JSON.parse(rawText);
    } catch (e) {
      // Se falhar, tenta extrair de um bloco de código markdown
      console.log('Falha no parse JSON direto. Tentando extrair de um bloco de código.');
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          data = JSON.parse(jsonMatch[1]);
        } catch (e2) {
          console.error('Erro ao fazer parse do JSON extraído do bloco de código:', e2);
          throw new Error(`Resposta JSON inválida da API do Cognito, mesmo após extração: ${rawText}`);
        }
      } else {
         console.error('Não foi possível extrair JSON da resposta:', rawText);
         throw new Error(`Resposta não é um JSON válido nem um bloco de código JSON: ${rawText}`);
      }
    }
    
    // Salva no cache
    if (useCache && data) {
      await cacheSet(cacheKey, JSON.stringify(data), CACHE_TTL);
    }

    return data;

  } catch (error) {
    console.error('Erro ao consultar o Cognito:', error);
    
    // Resposta de fallback em caso de erro
    return {
      answer: `Não foi possível processar sua solicitação no momento. Erro: ${error.message}`,
      confidence: 0,
      sources: [],
      error: true,
      errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
};

/**
 * Inicia uma nova sessão de chat com o Cognito
 * @returns {Promise<string>} ID da sessão
 */
export const startChatSession = async () => {
  try {
    const response = await fetch(`${COGNITO_API_URL}/api/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Erro ao iniciar sessão: ${response.statusText}`);
    }

    const { session_id } = await response.json();
    return session_id;
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error);
    throw error;
  }
};

/**
 * Envia uma mensagem para o Cognito e retorna a resposta em streaming
 * @param {string} message - A mensagem do usuário
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<ReadableStream>} Stream de resposta
 */
export const streamChatResponse = async (message, sessionId) => {
  try {
    const response = await fetch(`${COGNITO_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro no chat: ${response.status} - ${errorText}`);
    }

    return response.body;
  } catch (error) {
    console.error('Erro no chat com streaming:', error);
    throw error;
  }
};

/**
 * Gera insights a partir de um conjunto de notas
 * @param {Array<Object>} notes - Notas para análise
 * @param {string} [prompt] - Prompt personalizado para geração de insights
 * @returns {Promise<Array<Object>>} Insights gerados
 */
export const generateInsights = async (notes, prompt = 'Analise as seguintes notas e gere insights estratégicos:') => {
  try {
    const context = notes
      .map(note => `# ${note.title || 'Nota sem título'}\n\n${note.content || ''}`)
      .join('\n\n---\n\n');

    const fullPrompt = `${prompt}\n\n${context}`;
    const response = await queryCognito(fullPrompt, { useCache: false });
    
    // Tenta extrair JSON da resposta
    try {
      const jsonMatch = response.answer?.match(/\[\s*\{.*\}\s*\]/s);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      console.error('Erro ao processar insights:', e);
      return [];
    }
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    return [];
  }
};