/**
 * Ponto de entrada para executar uma ferramenta com base em seu nome.
 * @param {string} toolName - O nome da ferramenta a ser executada.
 * @param {any} toolInput - O input para a ferramenta (ex: termo de busca).
 * @returns {Promise<any>} O resultado da execução da ferramenta.
 */
export const executeTool = async (toolName, toolInput) => {
  switch (toolName) {
    case 'web_search':
      return await webSearch(toolInput);
    case 'http_get':
      return await httpGet(toolInput);
    default:
      throw new Error(`Ferramenta desconhecida: ${toolName}`);
  }
};

/**
 * Simula uma busca na web.
 * No futuro, isso chamaria uma API real (Google, SerpAPI, etc.).
 * @param {string} query - O termo a ser pesquisado.
 * @returns {Promise<string>} Uma string formatada com os resultados da busca.
 */
const webSearch = async (query) => {
  console.log(`Executando busca na web para: "${query}"`);

  // Preferência: Tavily (https://api.tavily.com)
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tavilyKey}` },
      body: JSON.stringify({ query, include_images: false, max_results: 5 })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Tavily error: ${res.status} ${t}`);
    }
    const data = await res.json();
    // Normalize
    const results = (data.results || []).map(r => ({ title: r.title, link: r.url, snippet: r.content }));
    return JSON.stringify(results);
  }

  // Fallback: SerpAPI (requires SERPAPI_KEY)
  const serpKey = process.env.SERPAPI_KEY;
  if (serpKey) {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', serpKey);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`SerpAPI error: ${res.status} ${t}`);
    }
    const data = await res.json();
    const results = (data.organic_results || []).slice(0,5).map(r => ({ title: r.title, link: r.link, snippet: r.snippet }));
    return JSON.stringify(results);
  }

  throw new Error('Nenhum provedor de busca configurado. Defina TAVILY_API_KEY ou SERPAPI_KEY.');
};

const httpGet = async (input) => {
  // input: { url: string, headers?: Record<string,string> }
  let parsed;
  try { parsed = typeof input === 'string' ? JSON.parse(input) : input; } catch { parsed = { url: input }; }
  const { url, headers = {} } = parsed || {};
  if (!url) throw new Error('http_get requer {"url": "..."}');
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text;
};
