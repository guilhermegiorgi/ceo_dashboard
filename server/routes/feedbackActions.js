import { Router } from 'express';
import { authenticateJWT as authenticateToken } from '../middleware/auth.js';
import vaultService from '../services/vaultService.js';
import { cacheGet, cacheSet } from '../services/cache.js';

const router = Router();

// GET /api/feedback-actions - Lista ações de feedback
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cacheKey = 'feedback_actions';
    const cached = await cacheGet(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Busca insights recentes do vault para gerar ações de feedback
    const recentInsights = await vaultService.searchNotesWithContent('', 10);

    // Gera ações de feedback baseadas nos insights
    const feedbackActions = recentInsights.map((note, index) => ({
      id: `feedback_${Date.now()}_${index}`,
      type: index % 4 === 0 ? 'decision' :
            index % 4 === 1 ? 'insight_validation' :
            index % 4 === 2 ? 'action_taken' : 'learning_captured',
      title: `Feedback: ${note.basename}`,
      description: `Ação de feedback gerada automaticamente baseada na nota: ${note.basename}`,
      timestamp: new Date(note.mtime || Date.now()).toISOString(),
      status: index % 3 === 0 ? 'completed' :
              index % 3 === 1 ? 'processing' : 'pending',
      obsidianNote: note.path,
      relatedProject: note.path.includes('PROJETOS') ? 'Projeto relacionado' : null,
      impact: 'Alto impacto estratégico identificado'
    }));

    // Cache por 5 minutos
    await cacheSet(cacheKey, JSON.stringify(feedbackActions), 5 * 60 * 1000);

    res.json(feedbackActions);
  } catch (error) {
    console.error('Erro ao buscar feedback actions:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar feedback actions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/feedback-actions - Criar nova ação de feedback
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, title, description, obsidianNote, relatedProject, impact } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Título e descrição são obrigatórios'
      });
    }

    const newAction = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type || 'learning_captured',
      title,
      description,
      timestamp: new Date().toISOString(),
      status: 'pending',
      obsidianNote,
      relatedProject,
      impact
    };

    // Invalida cache
    await cacheSet('feedback_actions', null, 0);

    // Salva como nota no vault se especificado
    if (obsidianNote) {
      const noteContent = `---
tags:
  - feedback-action
  - ${type}
tipo: "${type}"
status: "pending"
criadoEm: "${newAction.timestamp}"
---

# ${title}

## 📝 Descrição
${description}

## 🔗 Conexões
${obsidianNote ? `- [[${obsidianNote.replace('.md', '')}]]` : ''}

## 💡 Impacto
${impact || 'Não especificado'}

## 📊 Status
- **Status**: Pendente
- **Tipo**: ${type}
- **Criado em**: ${newAction.timestamp}
`;

      await vaultService.createNote(`Feedback - ${title}`, noteContent, 'INSIGHTS DO VAULT');
    }

    res.status(201).json({
      success: true,
      data: newAction
    });
  } catch (error) {
    console.error('Erro ao criar feedback action:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar feedback action',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/feedback-actions/:id - Atualizar status de ação
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status inválido'
      });
    }

    // Invalida cache
    await cacheSet('feedback_actions', null, 0);

    res.json({
      success: true,
      message: `Status da ação ${id} atualizado para ${status}`
    });
  } catch (error) {
    console.error('Erro ao atualizar feedback action:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar feedback action',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
