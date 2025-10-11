import express from 'express';
import vaultService from '../services/vaultService.js';

const router = express.Router();

/**
 * @route   GET /api/decisions
 * @desc    Obtém todas as decisões disponíveis
 * @access  Privado
 */
router.get('/', async (req, res) => {
  try {
    // Por enquanto, retorna uma lista vazia
    res.json([]);
  } catch (error) {
    console.error('Erro ao buscar decisões:', error);
    res.status(500).json({ error: 'Falha ao buscar decisões.', details: error.message });
  }
});

// Helper para formatar a data no formato YYYY-MM-DD
const getFormattedDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formata os dados da decisão em uma nota Markdown estruturada.
 * @param {object} decisionData - Os dados da requisição.
 * @returns {string} - O conteúdo da nota em Markdown.
 */
const formatDecisionToMarkdown = (decisionData) => {
  const {
    title,
    description,
    context,
    decision,
    rationale,
    expected_outcome,
    confidence,
    impact,
    category,
    tags = [],
    related_insights = []
  } = decisionData;

  const today = getFormattedDate();

  return `---
tags: decision, ${tags.join(', ')}
category: ${category || 'Uncategorized'}
confidence: ${confidence || 'N/A'}
impact: ${impact || 'N/A'}
status: pending
created_date: ${today}
---

# Decision: ${title}

## 1. Contexto e Descrição
*O que levou a esta decisão? Qual o cenário atual?*

${description || 'N/A'}

## 2. A Decisão Tomada
*Qual foi a escolha final?*

${decision || 'N/A'}

## 3. Racional e Justificativa
*Por que esta decisão foi tomada? Quais alternativas foram consideradas?*

${rationale || 'N/A'}

## 4. Resultado Esperado
*O que se espera alcançar com esta decisão?*

${expected_outcome || 'N/A'}

## 5. Insights Relacionados
*Quais insights do dashboard ou outras fontes informaram esta decisão?*

${related_insights.length > 0 ? related_insights.map(insight => `- ${insight}`).join('\n') : 'Nenhum'}
`;
};

/**
 * Endpoint para criar uma nova decisão.
 * Recebe os dados da decisão, formata-os em Markdown e envia para o Cognito.
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, decision, rationale } = req.body;

    if (!title || !description || !decision || !rationale) {
      return res.status(400).json({ 
        error: 'Os campos title, description, decision e rationale são obrigatórios.' 
      });
    }

    // 1. Formatar os dados em uma nota Markdown
    const noteContent = formatDecisionToMarkdown(req.body);
    
    // 2. Formatar o nome do arquivo e chamar o vaultService
    const today = getFormattedDate();
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);
    const noteTitle = `${today}-${safeTitle}`;
    const folderName = 'decisions';

    const vaultResponse = await vaultService.createNote(noteTitle, noteContent, folderName);

    res.status(201).json({ 
      message: 'Decisão registrada com sucesso no Segundo Cérebro!', 
      path: vaultResponse.path, // Assuming the service returns the path of the created note
      vaultResponse: vaultResponse 
    });

  } catch (error) {
    console.error('Erro ao registrar a decisão:', error);
    res.status(500).json({ error: 'Falha ao registrar a decisão.', details: error.message });
  }
});

export default router;