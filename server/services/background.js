import { generateWeeklyInsights } from './insightService.js';
import { dbRun, dbAll } from './database.js';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import * as agentService from './agentService.js';

let backgroundIntervals = [];
let scheduledJobs = new Map(); // agentId -> cron task
const badSchedules = new Set(); // remember invalid schedules to avoid log spam

export async function startBackgroundServices() {
  console.log('Starting background services...');

  // Periodic insight generation (every 5 minutes) - DESATIVADO
  // A geração automática foi desativada para controlar o uso de tokens.
  // Os insights agora são gerados apenas sob demanda pelo usuário na interface.
  /*
  const insightInterval = setInterval(async () => {
    try {
      await generatePeriodicInsights();
    } catch (error) {
      console.error('Background insight generation error:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
  */

  // Knowledge graph sync (every 10 minutes) - TEMPORARILY DISABLED
  // const syncInterval = setInterval(async () => {
  //   try {
  //     await syncKnowledgeGraph();
  //   } catch (error) {
  //     console.error('Knowledge graph sync error:', error);
  //   }
  // }, 10 * 60 * 1000); // 10 minutes

  // Health check and cleanup (every hour)
  const cleanupInterval = setInterval(async () => {
    try {
      await performCleanup();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  backgroundIntervals.push(/*syncInterval,*/ cleanupInterval);
  console.log('Background services started successfully');

  // Inicializa agendamento de agentes
  await refreshAgentSchedules();
  // Revalida o agendamento a cada 2 minutos (caso schedules sejam alterados)
  const refreshHandle = setInterval(refreshAgentSchedules, 2 * 60 * 1000);
  backgroundIntervals.push(refreshHandle);
}

export function stopBackgroundServices() {
  backgroundIntervals.forEach(interval => clearInterval(interval));
  backgroundIntervals = [];
  // Para tarefas cron
  scheduledJobs.forEach(task => task.stop());
  scheduledJobs.clear();
  console.log('Background services stopped');
}

async function generatePeriodicInsights() {
  console.log('Generating periodic insights...');
  
  try {
    const insights = await generateWeeklyInsights();

    if (!insights || insights.length === 0) {
      console.log('No new insights generated.');
      return;
    }

    // Store insights in database
    for (const insight of insights) {
      await dbRun(`
        INSERT OR IGNORE INTO insights (id, type, title, description, confidence, urgency, connectedElements, suggestedAction, potentialImpact, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        insight.id || uuidv4(), // Usa o ID da IA ou gera um novo
        insight.type,
        insight.title,
        insight.description,
        insight.confidence,
        insight.urgency,
        JSON.stringify(insight.connectedElements || []),
        insight.suggestedAction,
        insight.potentialImpact,
        'background'
      ]);
    }
    
    // Broadcast new insights to connected clients
    if (global.broadcastToClients && insights.length > 0) {
      global.broadcastToClients({
        type: 'new_insights',
        data: insights,
        count: insights.length
      });
    }
    
    console.log(`Generated and stored ${insights.length} periodic insights.`);
  } catch (error) {
    console.error('Failed to generate periodic insights:', error);
  }
}

async function syncKnowledgeGraph() {
  console.warn('syncKnowledgeGraph is temporarily disabled and will not run.');
}

async function performCleanup() {
  console.log('Performing cleanup...');
  
  try {
    // Clean up old insights (older than 30 days)
    await dbRun(`
      DELETE FROM insights 
      WHERE created_at < datetime('now', '-30 days')
    `);
    
    // Clean up old feedback actions (older than 90 days)
    await dbRun(`
      DELETE FROM feedback_actions 
      WHERE created_at < datetime('now', '-90 days')
    `);
    
    // Update database statistics
    await dbRun('VACUUM');
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Failed to perform cleanup:', error);
  }
}

async function refreshAgentSchedules() {
  try {
    const agents = await dbAll('SELECT * FROM agents WHERE schedule IS NOT NULL AND schedule != ""');
    const activeIds = new Set();
    for (const agent of agents) {
      activeIds.add(agent.id);
      if (!scheduledJobs.has(agent.id)) {
        const expr = String(agent.schedule || '').trim();
        const isManual = expr.toLowerCase() === 'manual';
        const hasValidate = typeof cron.validate === 'function';
        const isValid = !isManual && expr.length > 0 && (!hasValidate || cron.validate(expr));

        if (!isValid) {
          if (!badSchedules.has(agent.id)) {
            console.warn('Cron inválido/ignorado para agente', agent.id, agent.name || '', expr);
            badSchedules.add(agent.id);
          }
          continue;
        }

        // Tenta agendar
        try {
          const task = cron.schedule(expr, async () => {
            try {
              await agentService.runAgent(agent.id);
            } catch (err) {
              console.error('Agente agendado falhou:', agent.id, err);
            }
          }, { scheduled: true });
          scheduledJobs.set(agent.id, task);
          console.log('Agente agendado:', agent.name, expr);
        } catch (e) {
          if (!badSchedules.has(agent.id)) {
            console.warn('Cron inválido para agente', agent.id, expr, e.message);
            badSchedules.add(agent.id);
          }
        }
      }
    }
    // Remove jobs que não existem mais
    for (const [id, task] of scheduledJobs.entries()) {
      if (!activeIds.has(id)) {
        task.stop();
        scheduledJobs.delete(id);
        console.log('Agendamento removido para agente', id);
      }
    }
  } catch (error) {
    console.error('Falha ao atualizar agendamentos de agentes:', error);
  }
}
