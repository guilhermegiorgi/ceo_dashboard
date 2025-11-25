import MCPClient from "./mcpClient.js";
import { getDecryptedApiKey } from "./aiProviderService.js";

// Inicializa cliente MCP
const mcpClient = new MCPClient({
  baseUrl:
    process.env.VITE_BRAINCLOUD_BASE_URL || "https://obsidian-mcp.ggailabs.com",
  apiToken:
    process.env.VITE_BRAINCLOUD_API_TOKEN ||
    "ggai_90e2c6b20c8315906f843798bbc1598df596978a2ec79457e6d00563c76d03dc",
});

/**
 * Ponto de entrada para executar uma ferramenta com base em seu nome.
 * @param {string} toolName - O nome da ferramenta a ser executada.
 * @param {any} toolInput - O input para a ferramenta (ex: termo de busca).
 * @param {string} userId - O ID do usuário para recuperar a chave de API.
 * @returns {Promise<any>} O resultado da execução da ferramenta.
 */
export const executeTool = async (toolName, toolInput, userId) => {
  // Parse input if it's a JSON string
  let parsedInput = toolInput;
  if (typeof toolInput === "string") {
    try {
      parsedInput = JSON.parse(toolInput);
    } catch (e) {
      // Keep as string if not valid JSON
      parsedInput = toolInput;
    }
  }

  // ==========================================
  // FERRAMENTAS TRADICIONAIS (Web, HTTP)
  // ==========================================
  if (toolName === "web_search") {
    return await webSearch(parsedInput);
  }
  if (toolName === "http_get") {
    return await httpGet(parsedInput);
  }

  // ==========================================
  // FERRAMENTAS MCP - DESCOBERTA
  // ==========================================
  if (toolName === "mcp_list_files") {
    const directory = parsedInput?.directory || parsedInput || "";
    const result = await mcpClient.listFiles(directory);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_get_file") {
    const filepath = parsedInput?.filepath || parsedInput;
    if (!filepath) throw new Error("mcp_get_file requer filepath");
    const result = await mcpClient.getFileContents(filepath);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_search_files") {
    const query = parsedInput?.query || parsedInput;
    if (!query) throw new Error("mcp_search_files requer query");
    const result = await mcpClient.searchFiles(
      query,
      parsedInput?.caseSensitive,
      parsedInput?.fileExtensions
    );
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_semantic_search") {
    const query = parsedInput?.query || parsedInput;
    if (!query) throw new Error("mcp_semantic_search requer query");
    const limit = parsedInput?.limit || 5;
    const result = await mcpClient.semanticSearch(query, limit);
    return JSON.stringify(result, null, 2);
  }

  // ==========================================
  // FERRAMENTAS MCP - CONTEXTO
  // ==========================================
  if (toolName === "mcp_get_vault_tree") {
    const directory = parsedInput?.directory || "";
    const depth = parsedInput?.depth || 2;
    const result = await mcpClient.getVaultTree(directory, depth);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_get_graph") {
    const directory = parsedInput?.directory || "";
    const includeOrphans = parsedInput?.includeOrphans !== false;
    const result = await mcpClient.getGraphData(directory, includeOrphans);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_get_main_tags") {
    const limit = parsedInput?.limit || parsedInput || 10;
    const result = await mcpClient.getMainTags(limit);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_get_main_links") {
    const limit = parsedInput?.limit || parsedInput || 10;
    const result = await mcpClient.getMainLinks(limit);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_get_focus") {
    const result = await mcpClient.getCurrentFocus();
    return JSON.stringify(result, null, 2);
  }

  // ==========================================
  // FERRAMENTAS MCP - TAREFAS
  // ==========================================
  if (toolName === "mcp_get_tasks") {
    const window = parsedInput?.window || "all";
    const includeCompleted = parsedInput?.includeCompleted || false;
    const result = await mcpClient.getDueTasks(window, includeCompleted);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_get_tasks_summary") {
    const range = parsedInput?.range || parsedInput || "this_week";
    const result = await mcpClient.getTasksSummary(range);
    return JSON.stringify(result, null, 2);
  }

  // ==========================================
  // FERRAMENTAS MCP - NOTAS PERIÓDICAS
  // ==========================================
  if (toolName === "mcp_get_periodic_note") {
    const period = parsedInput?.period || parsedInput || "daily";
    const result = await mcpClient.getPeriodicNote(period);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_get_recent_periodic") {
    const period = parsedInput?.period || "daily";
    const limit = parsedInput?.limit || 5;
    const result = await mcpClient.getRecentPeriodicNotes(period, limit);
    return JSON.stringify(result, null, 2);
  }

  // ==========================================
  // FERRAMENTAS MCP - ESCRITA
  // ==========================================
  if (toolName === "mcp_write_file") {
    const filepath = parsedInput?.filepath;
    const content = parsedInput?.content;
    if (!filepath || content === undefined) {
      throw new Error("mcp_write_file requer filepath e content");
    }
    const createParents = parsedInput?.createParents || false;
    const result = await mcpClient.writeFile(filepath, content, createParents);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_append_content") {
    const filepath = parsedInput?.filepath;
    const content = parsedInput?.content;
    if (!filepath || content === undefined) {
      throw new Error("mcp_append_content requer filepath e content");
    }
    const separator = parsedInput?.separator || "\n";
    const result = await mcpClient.appendContent(filepath, content, separator);
    return JSON.stringify(result, null, 2);
  }

  // ==========================================
  // FERRAMENTAS MCP - MEMÓRIA
  // ==========================================
  if (toolName === "mcp_search_conversations") {
    const query = parsedInput?.query || parsedInput;
    if (!query) throw new Error("mcp_search_conversations requer query");
    const limit = parsedInput?.limit || 5;
    const result = await mcpClient.searchConversationHistory(query, limit);
    return JSON.stringify(result, null, 2);
  }

  if (toolName === "mcp_get_historical_context") {
    const query = parsedInput?.query || parsedInput;
    if (!query) throw new Error("mcp_get_historical_context requer query");
    const limit = parsedInput?.limit || 5;
    const result = await mcpClient.getHistoricalContext(query, limit);
    return JSON.stringify(result, null, 2);
  }

  throw new Error(`Ferramenta desconhecida: ${toolName}`);
};

/**
 * Simula uma busca na web.
 * No futuro, isso chamaria uma API real (Google, SerpAPI, etc.).
 * @param {string} query - O termo a ser pesquisado.
 * @returns {Promise<string>} Uma string formatada com os resultados da busca.
 */
const webSearch = async (query, userId) => {Id) => {
  console.log(`Executando busca na web para: "${query}"`);

  // Preferência 1: Perplexity (se configurado)
  const perplexityKey = await getDecryptedApiKey(userId, "perplexity");
  if (perplexityKey) {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${perplexityKey}`,
      },
      body: JSON.stringify({
        model: "pplx-70b-online", // Modelo de busca online
        messages: [{ role: "user", content: `Search the web for: ${query}` }],
        stream: false,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Perplexity error: ${res.status} ${t}`);
    }
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || "Nenhuma resposta encontrada.";
    
    // Retorna a resposta sintetizada, que é o forte do Perplexity
    return JSON.stringify({ source: "Perplexity", answer: answer });
  }

  // Preferência 2: Tavily (https://api.tavily.com)
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tavilyKey}`,
      },
      body: JSON.stringify({ query, include_images: false, max_results: 5 }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Tavily error: ${res.status} ${t}`);
    }
    const data = await res.json();
    // Normalize
    const results = (data.results || []).map((r) => ({
      title: r.title,
      link: r.url,
      snippet: r.content,
    }));
    return JSON.stringify(results);
  }

  // Fallback: SerpAPI (requires SERPAPI_KEY)
  const serpKey = process.env.SERPAPI_KEY;
  if (serpKey) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", serpKey);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`SerpAPI error: ${res.status} ${t}`);
    }
    const data = await res.json();
    const results = (data.organic_results || [])
      .slice(0, 5)
      .map((r) => ({ title: r.title, link: r.link, snippet: r.snippet }));
    return JSON.stringify(results);
  }

  throw new Error(
    "Nenhum provedor de busca configurado. Defina TAVILY_API_KEY ou SERPAPI_KEY."
  );
};

const httpGet = async (input) => {
  // input: { url: string, headers?: Record<string,string> }
  let parsed;
  try {
    parsed = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    parsed = { url: input };
  }
  const { url, headers = {} } = parsed || {};
  if (!url) throw new Error('http_get requer {"url": "..."}');
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text;
};
