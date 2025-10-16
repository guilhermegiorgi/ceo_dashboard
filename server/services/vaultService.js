import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { brainCloudClient } from './brainCloudClient.js';

// Carrega variáveis .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Diretório de escrita na OBC (deve bater com settings.READ_WRITE_DIR do servidor)
const WRITE_DIR = process.env.BRAINCLOUD_WRITE_DIR || '5 - INSIGHTS-IA';

class VaultService {
    constructor() {
        this.writeDir = WRITE_DIR;
        this.initializeVault();
    }

    /**
     * Verifica conectividade com a OBC e status do vault.
     */
    async initializeVault() {
        try {
            const status = await brainCloudClient.vaultStatus();
            if (status && typeof status === 'object') {
                console.log('Conectado ao Obsidian Brain Cloud. Status do vault recebido.');
            }
        } catch (error) {
            console.warn('Não foi possível consultar o status do vault na Brain Cloud:', error.message);
        }
    }

    /**
     * Procura por notas no vault.
     * @param {string} query - filtro por nome (regex)
     * @param {string} [folder=''] - subpasta para restringir a busca
     * @returns {Promise<{results: Array<{path:string, basename:string}>}>}
     */
    async searchNotes(query, folder = '') {
        console.log(`[OBC] Buscando notas: query="${query}" folder="${folder}"`);
        try {
            const rules = query && query.trim() !== ''
                ? { "in": [query, { "var": "name" }] }
                : { "in": [".md", { "var": "name" }] };

            const directories = folder ? [folder] : undefined;
            const resp = await brainCloudClient.complexSearch({ rules, directories, limit: 200 });
            const items = (resp?.results || [])
                .filter(it => it?.path?.endsWith('.md'))
                .map(it => ({ path: it.path, basename: path.basename(it.path) }));
            return { results: items };
        } catch (error) {
            console.error('Erro ao buscar notas (OBC):', error);
            return { results: [] };
        }
    }

    /**
     * Lê o conteúdo de uma nota específica.
     * @param {string} notePath - caminho relativo no vault
     * @returns {Promise<{content: string}|null>}
     */
    async getNoteContent(notePath) {
        try {
            const data = await brainCloudClient.getFile(notePath);
            return { content: data?.content ?? '' };
        } catch (error) {
            console.error(`Erro ao ler o conteúdo da nota (OBC) ${notePath}:`, error);
            return null;
        }
    }

    /**
     * Cria uma nova nota no vault via OBC.
     */
    async createNote(noteTitle, content, folder = '') {
        try {
            const safeTitle = noteTitle.replace(/[\\/:"*?<>|]/g, '');
            const relative = folder ? `${folder}/${safeTitle}.md` : `${safeTitle}.md`;
            const notePath = `${this.writeDir}/${relative}`;
            await brainCloudClient.writeFile(notePath, content, true);
            console.log(`[OBC] Nota criada em: ${notePath}`);
            return { path: notePath };
        } catch (error) {
            console.error(`Erro ao criar nota via OBC "${noteTitle}":`, error);
            throw error;
        }
    }

    /**
     * Dispara sincronização no servidor OBC.
     */
    async syncFromGit() {
        try {
            console.log('[OBC] Disparando sincronização imediata');
            const resp = await brainCloudClient.syncNow();
            return { success: resp?.success !== false, message: resp?.message || 'Sync acionado' };
        } catch (error) {
            console.error('Erro ao sincronizar via OBC:', error);
            return { success: false, message: `Erro na sincronização: ${error.message}` };
        }
    }

    /**
     * Compatibilidade: chama syncFromGit (OBC gerencia push/pull).
     */
    async syncToGit(message = 'Sync from CEO Dashboard') {
        return this.syncFromGit();
    }

    /**
     * Estatísticas básicas do vault.
     */
    async getVaultStats() {
        try {
            const status = await brainCloudClient.vaultStatus();
            return {
                totalNotes: status?.total_files ?? 0,
                totalLinks: 0,
                totalTags: 0,
                folderStats: {},
                topTags: []
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas do vault (OBC):', error);
            return { totalNotes: 0, totalLinks: 0, totalTags: 0, folderStats: {}, topTags: [] };
        }
    }

    /**
     * Busca notas com conteúdo (batch) para análise.
     */
    async searchNotesWithContent(query, limit = 20) {
        try {
            const { results } = await this.searchNotes(query);
            const selected = results.slice(0, limit).map(r => r.path);
            if (selected.length === 0) return [];
            const batch = await brainCloudClient.batchGet(selected, true);
            const items = (batch?.files || [])
                .filter(f => f.success && f.file)
                .map(f => ({
                    path: f.path,
                    basename: path.basename(f.path),
                    content: f.file?.content ?? '',
                    mtime: Date.now()
                }));
            return items;
        } catch (error) {
            console.error('Erro ao buscar notas com conteúdo (OBC):', error);
            return [];
        }
    }

    async getFileMtime(notePath) {
        // Sem suporte direto; usamos timestamp atual como fallback
        return Date.now();
    }

    async getObcStatus() {
        try {
            const [sync, vault] = await Promise.all([
                brainCloudClient.syncStatus(),
                brainCloudClient.vaultStatus()
            ]);
            return { sync, vault };
        } catch (error) {
            console.error('Erro ao buscar status OBC:', error);
            return { error: String(error) };
        }
    }

    async getRecentChanges(limit = 10, days = 30) {
        try {
            const resp = await brainCloudClient.getRecentChanges({ limit, days });
            return resp;
        } catch (error) {
            console.error('Erro ao buscar mudanças recentes (OBC):', error);
            return { files: [], limit, days };
        }
    }

    /**
     * Salva um insight gerado pela IA como uma nova nota no vault via OBC.
     */
    async saveInsightNote(insightData) {
        const folder = 'INSIGHTS DO VAULT';

        const typeTranslations = {
            'unexpected_connection': 'conexao_inesperada',
            'knowledge_gap': 'lacuna_de_conhecimento',
            'success_pattern': 'padrao_de_sucesso',
            'strategic_question': 'questao_estrategica'
        };

        const urgencyTranslations = {
            'high': 'alta',
            'medium': 'media',
            'low': 'baixa'
        };

        const translatedType = typeTranslations[insightData.type] || insightData.type || 'desconhecido';
        const translatedUrgency = urgencyTranslations[insightData.urgency] || insightData.urgency || 'N/A';

        const now = new Date();
        const datePrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const cleanTitle = (insightData.title || 'Insight sem título').replace(/[\\/:":*?<>|]/g, '');
        const noteTitle = `${datePrefix} - ${cleanTitle}`;

        const relatedNotesContent = (insightData.relatedNotes || [])
            .map(note => `- [[${note.replace(/\.md$/, '')}]]`)
            .join('\n');

        const content = `---
        tags:
          - insight/ia
          - insight/gerado
        tipo: "${translatedType}"
        urgencia: "${translatedUrgency}"
        confianca: ${insightData.confidence || 0}
        criadoEm: "${insightData.createdAt || new Date().toISOString()}"
        ---

        # ${insightData.title}

        ## 🧠 O Insight
        > ${insightData.description}

        ## 🔗 Conexões Relevantes
        ${relatedNotesContent || 'Nenhuma nota diretamente relacionada.'}

        ## 💡 Potencial Impacto
        ${insightData.potentialImpact || 'Não especificado.'}

        ## 🚀 Ação Sugerida
        ${insightData.suggestedAction || 'Analisar e definir próximos passos.'}
        `;

        console.log(`Salvando nota de insight via OBC: "${noteTitle}"`);
        const result = await this.createNote(noteTitle, content, folder);
        await this.syncFromGit();
        return result;
    }
}

export default new VaultService();
