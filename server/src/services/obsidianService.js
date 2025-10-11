import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { cache } from './cache.js';
import { logger } from '../utils/logger.js';
import config from '../../config/config.js';
import cognitoService from './cognitoService.js';

// Chaves de cache
const CACHE_KEYS = {
  VAULT_INDEX: (userId) => `obsidian:${userId}:index`,
  NOTE_CONTENT: (userId, noteId) => `obsidian:${userId}:note:${noteId}`,
  RECENT_NOTES: (userId) => `obsidian:${userId}:recent`,
  TAGS: (userId) => `obsidian:${userId}:tags`
};

// Tempo de cache padrão (1 hora)
const DEFAULT_CACHE_TTL = 3600;

// Mapeamento de usuários para seus respectivos vaults
// Em produção, isso viria de um banco de dados
const userVaults = new Map();

/**
 * Indexa o conteúdo do vault para um usuário
 * @param {string} userId - ID do usuário
 * @param {string} [vaultPath] - Caminho opcional para o vault
 * @returns {Promise<Object>} Resultado da indexação
 */
async function indexVault(userId) {
  try {
    logger.info(`Iniciando indexação do vault via MCP para o usuário ${userId}`);

    const allFiles = await mcp_listVaultFiles();

    // Filtra apenas arquivos Markdown fora de diretórios ignorados
    const markdownFiles = allFiles.filter(file => 
      file.path.endsWith('.md') && 
      !file.path.startsWith('.obsidian/') &&
      !file.path.startsWith('.trash/')
    );
    
    const index = [];
    const tags = new Set();
    
    // Processa cada arquivo Markdown
    for (const file of markdownFiles) {
      try {
        const content = await mcp_getNoteContent(file.path);
        const fileName = path.basename(file.path, '.md');
        
        // Extrai metadados do frontmatter (se existir)
        const { frontmatter, body } = parseFrontmatter(content);

        // Gera resumo e insights com o serviço de IA
        const summary = await cognitoService.summarizeText(body, { maxLength: 150 });
        const insights = await cognitoService.generateInsights(
          { content: body },
          { type: 'note_analysis', maxInsights: 3 }
        );
        
        // Extrai tags do conteúdo (formato #tag)
        const contentTags = extractTags(content);
        contentTags.forEach(tag => tags.add(tag));
        
        // Cria o objeto de metadados da nota
        const noteId = uuidv4();
        
        const note = {
          id: noteId,
          title: frontmatter.title || fileName,
          fileName,
          path: file.path,
          folder: path.dirname(file.path),
          summary, // Adiciona o resumo gerado pela IA
          insights: { // Adiciona os insights gerados
            keyFindings: insights.keyFindings,
            recommendations: insights.recommendations,
          },
          tags: [...new Set([...contentTags, ...(frontmatter.tags || [])])],
          // Nota: mtime e ctime não são fornecidos pela API do Obsidian via MCP,
          // dependemos do frontmatter para isso.
          created: frontmatter.created || new Date().toISOString(),
          modified: frontmatter.updated || new Date().toISOString(),
          size: content.length,
          wordCount: body.split(/\s+/).filter(Boolean).length,
          links: extractLinks(body),
          metadata: {
            ...frontmatter,
            // Remove campos já processados para evitar duplicação
            title: undefined,
            tags: undefined,
            created: undefined,
            updated: undefined
          }
        };
        
        index.push(note);
        
        // Armazena o conteúdo da nota no cache
        await cache.set(
          CACHE_KEYS.NOTE_CONTENT(userId, noteId), 
          { content: body, metadata: note },
          DEFAULT_CACHE_TTL
        );
        
      } catch (error) {
        logger.error(`Erro ao processar arquivo ${file.path}:`, error);
        // Continua com o próximo arquivo mesmo se houver erro
      }
    }
    
    // Atualiza o índice no cache
    await cache.set(
      CACHE_KEYS.VAULT_INDEX(userId), 
      { notes: index, lastUpdated: new Date().toISOString() },
      DEFAULT_CACHE_TTL
    );
    
    // Atualiza a lista de tags
    await cache.set(
      CACHE_KEYS.TAGS(userId),
      { tags: Array.from(tags), lastUpdated: new Date().toISOString() },
      DEFAULT_CACHE_TTL
    );
    
    // Atualiza a data da última sincronização
    if (userVaults.has(userId)) {
      userVaults.get(userId).lastSynced = new Date().toISOString();
    }
    
    logger.info(`Vault indexado com sucesso para o usuário ${userId}`, { 
      totalNotes: index.length,
      totalTags: tags.size
    });
    
    return {
      success: true,
      stats: {
        totalNotes: index.length,
        totalTags: tags.size,
        lastUpdated: new Date().toISOString()
      }
    };
    
  } catch (error) {
    logger.error('Erro ao indexar o vault:', error, { userId });
    throw new Error(`Falha ao indexar o vault: ${error.message}`);
  }
}

/**
 * Obtém as notas recentes de um usuário
 * @param {string} userId - ID do usuário
 * @param {Object} [options] - Opções de consulta
 * @param {number} [options.limit=10] - Número máximo de notas a retornar
 * @param {number} [options.days=7] - Número de dias para buscar notas
 * @returns {Promise<Array>} Lista de notas recentes
 */
async function getRecentNotes(userId, options = {}) {
  const { limit = 10, days = 7 } = options;
  const cacheKey = CACHE_KEYS.RECENT_NOTES(userId);
  
  try {
    // Tenta obter do cache primeiro
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached.slice(0, limit);
    }
    
    // Obtém o índice completo
    const index = await cache.get(CACHE_KEYS.VAULT_INDEX(userId));
    
    if (!index || !index.notes) {
      await indexVault(userId);
      return getRecentNotes(userId, options);
    }
    
    // Filtra notas recentes
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentNotes = index.notes
      .filter(note => new Date(note.modified) >= cutoffDate)
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))
      .slice(0, limit);
    
    // Armazena no cache por 1 hora
    await cache.set(cacheKey, recentNotes, 3600);
    
    return recentNotes;
    
  } catch (error) {
    logger.error('Erro ao obter notas recentes:', error, { userId });
    throw new Error('Falha ao recuperar notas recentes');
  }
}

/**
 * Obtém o conteúdo de uma nota específica
 * @param {string} userId - ID do usuário
 * @param {string} noteId - ID da nota
 * @returns {Promise<Object>} Conteúdo e metadados da nota
 */
async function getNoteContent(userId, noteId) {
  try {
    // Tenta obter do cache primeiro
    const cached = await cache.get(CACHE_KEYS.NOTE_CONTENT(userId, noteId));
    if (cached) {
      return cached;
    }
    
    // Se não estiver em cache, tenta recarregar o índice
    await indexVault(userId);
    
    // Tenta novamente após recarregar o índice
    const refreshed = await cache.get(CACHE_KEYS.NOTE_CONTENT(userId, noteId));
    if (refreshed) {
      return refreshed;
    }
    
    throw new Error('Nota não encontrada');
    
  } catch (error) {
    logger.error('Erro ao obter conteúdo da nota:', error, { userId, noteId });
    throw new Error(`Falha ao recuperar a nota: ${error.message}`);
  }
}

/**
 * Pesquisa notas com base em uma consulta
 * @param {string} userId - ID do usuário
 * @param {string} query - Termo de pesquisa
 * @param {Object} [options] - Opções de pesquisa
 * @returns {Promise<Array>} Notas que correspondem à pesquisa
 */
async function searchNotes(userId, query, options = {}) {
  const { limit = 20, offset = 0, tag = null } = options;
  
  try {
    // Obtém o índice
    const index = await cache.get(CACHE_KEYS.VAULT_INDEX(userId));
    
    if (!index || !index.notes) {
      await indexVault(userId);
      return searchNotes(userId, query, options);
    }
    
    // Normaliza a consulta
    const searchTerm = query.toLowerCase().trim();
    
    // Filtra as notas
    let results = index.notes.filter(note => {
      // Pesquisa no título e no conteúdo
      const inTitle = note.title.toLowerCase().includes(searchTerm);
      const inTags = note.tags.some(t => t.toLowerCase().includes(searchTerm));
      
      // Se uma tag for especificada, filtra por ela
      const matchesTag = tag ? note.tags.includes(tag) : true;
      
      return (inTitle || inTags) && matchesTag;
    });
    
    // Ordena por data de modificação (mais recentes primeiro)
    results.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    
    // Aplica paginação
    const paginatedResults = results.slice(offset, offset + limit);
    
    return {
      results: paginatedResults,
      total: results.length,
      limit,
      offset,
      hasMore: offset + paginatedResults.length < results.length
    };
    
  } catch (error) {
    logger.error('Erro ao pesquisar notas:', error, { userId, query });
    throw new Error('Falha ao realizar a pesquisa');
  }
}

/**
 * Lê um diretório recursivamente
 * @private
 */
async function mcp_listVaultFiles() {
  const result = await use_mcp_tool({
    server_name: 'obsidian',
    tool_name: 'obsidian_list_files_in_vault',
    arguments: {},
  });
  return result.files.map(file => ({ path: file }));
}

async function mcp_getNoteContent(filePath) {
  const result = await use_mcp_tool({
    server_name: 'obsidian',
    tool_name: 'obsidian_get_file_contents',
    arguments: { filepath: filePath },
  });
  return result.content;
}

async function mcp_searchNotes(query) {
  const result = await use_mcp_tool({
    server_name: 'obsidian',
    tool_name: 'obsidian_simple_search',
    arguments: { query },
  });
  return result;
}

/**
 * Analisa o frontmatter de uma nota Markdown
 * @private
 */
function parseFrontmatter(content) {
  const frontmatter = {};
  let body = content;
  
  // Verifica se há frontmatter (começa com --- na primeira linha)
  if (content.startsWith('---\n')) {
    const endOfFrontmatter = content.indexOf('\n---', 4);
    
    if (endOfFrontmatter !== -1) {
      const frontmatterText = content.slice(4, endOfFrontmatter);
      body = content.slice(endOfFrontmatter + 5);
      
      // Processa cada linha do frontmatter
      frontmatterText.split('\n').forEach(line => {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          
          // Processa valores especiais
          if (value.startsWith('[') && value.endsWith(']')) {
            // Array de strings (para tags)
            frontmatter[key] = value
              .slice(1, -1)
              .split(',')
              .map(s => s.trim().replace(/^['"]|['"]$/g, ''));
          } else if (value === 'true' || value === 'false') {
            // Booleano
            frontmatter[key] = value === 'true';
          } else if (!isNaN(Number(value)) && value.trim() !== '') {
            // Número
            frontmatter[key] = Number(value);
          } else if (value.startsWith('"') && value.endsWith('"') || 
                     value.startsWith("'") && value.endsWith("'")) {
            // String entre aspas
            frontmatter[key] = value.slice(1, -1);
          } else if (value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/)) {
            // Data ISO
            frontmatter[key] = new Date(value).toISOString();
          } else {
            // String simples
            frontmatter[key] = value;
          }
        }
      });
    }
  }
  
  return { frontmatter, body: body.trim() };
}

/**
 * Extrai tags do conteúdo da nota
 * @private
 */
function extractTags(content) {
  const tagRegex = /#([\p{L}\d_-]+)/gu;
  const tags = new Set();
  
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.add(match[1]);
  }
  
  return Array.from(tags);
}

/**
 * Extrai links do conteúdo da nota
 * @private
 */
function extractLinks(content) {
  // Links do tipo [[link]]
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  // Links Markdown [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  const links = new Set();
  
  let match;
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.add({
      type: 'wiki',
      text: match[1],
      target: match[1].split('|')[0] // Remove alias se existir
    });
  }
  
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    links.add({
      type: 'markdown',
      text: match[1],
      target: match[2]
    });
  }
  
  return Array.from(links);
}

/**
 * Salva uma nota de insight no diretório 'insights/' do vault.
 * @param {string} title - O título da nota.
 * @param {string} content - O conteúdo da nota em Markdown.
 * @returns {Promise<Object>} O resultado da operação de salvamento.
 */
async function saveInsightNote(title, content) {
  try {
    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
    const filePath = path.join('insights', fileName);

    logger.info(`Salvando nota de insight via MCP: ${filePath}`);

    const result = await use_mcp_tool({
      server_name: 'obsidian',
      tool_name: 'obsidian_append_content',
      arguments: {
        filepath: filePath,
        content: content,
      },
    });

    return { success: true, path: result.path };
  } catch (error) {
    logger.error('Erro ao salvar nota de insight via MCP:', error);
    throw new Error('Falha ao salvar a nota de insight.');
  }
}

export {
  indexVault,
  getRecentNotes,
  getNoteContent,
  searchNotes,
  CACHE_KEYS,
  saveInsightNote
};

export default {
  indexVault,
  getRecentNotes,
  getNoteContent,
  searchNotes,
  saveInsightNote
};
