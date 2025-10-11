import fetch from 'node-fetch';

/**
 * Lida com a listagem de modelos para um provedor específico.
 * @param {string} provider - O provedor de IA ('google', 'openai').
 * @param {string} apiKey - A chave de API para autenticação.
 * @returns {Promise<Array<Object>>} Uma lista de modelos disponíveis.
 */
export const listModels = async (provider, apiKey) => {
  switch (provider) {
    case 'google':
      return await listGoogleModels(apiKey);
    case 'openai':
      // A lógica para a OpenAI será adicionada aqui no futuro.
      // return await listOpenAIModels(apiKey);
      throw new Error('A listagem de modelos da OpenAI ainda não foi implementada.');
    default:
      throw new Error(`Provedor desconhecido: ${provider}`);
  }
};

/**
 * Busca e retorna a lista de modelos da API do Google Gemini.
 * @param {string} apiKey - A chave de API do Google.
 * @returns {Promise<Array<Object>>} A lista de modelos.
 */
const listGoogleModels = async (apiKey) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Erro da API do Google:', errorBody);
      throw new Error(`Falha ao buscar modelos do Google: ${errorBody.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Formata a resposta para um formato padronizado
    return data.models.map(model => ({
      id: model.name.replace('models/', ''), // ex: gemini-1.5-pro-latest
      name: model.displayName, // ex: Gemini 1.5 Pro Latest
      description: model.description,
    })).sort((a, b) => a.id.localeCompare(b.id)); // Ordena alfabeticamente

  } catch (error) {
    console.error('Erro ao conectar com a API do Google:', error);
    // Lança o erro para que o middleware de erro da rota possa capturá-lo
    throw error;
  }
};
