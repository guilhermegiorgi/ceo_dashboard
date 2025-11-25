import brainCloudClient from "./brainCloudClient.js";
import {
  getTaskPreferences as loadTaskPreferences,
  updateTaskPreferences as persistTaskPreferences,
  loadSettings,
} from "./settingsService.js";
import { loadUserSettings } from "./settingsServiceDB.js";

const CHECKBOX_REGEX = /(-\s*\[)( |x|X)(\])/;

function normalizeText(text) {
  return text
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeNewline(content) {
  if (content.includes("\r\n")) return "\r\n";
  return "\n";
}

function toggleLine(line, completed) {
  if (!CHECKBOX_REGEX.test(line)) return { line, updated: false };
  const mark = completed ? "x" : " ";
  const updatedLine = line.replace(CHECKBOX_REGEX, `$1${mark}$3`);
  return {
    line: updatedLine,
    updated: updatedLine !== line,
  };
}

export async function toggleTaskCompletion({
  filePath,
  lineNumber,
  title,
  completed = true,
  user = null,
}) {
  if (!filePath) {
    throw new Error("filePath é obrigatório para atualizar uma tarefa.");
  }

  console.log('[toggleTaskCompletion] Input:', { filePath, lineNumber, title: title?.substring(0, 50), completed, hasUser: !!user });

  // Check if file is in writable area (5 - INSIGHTS-IA/) unless allowEditAllDirectories is enabled
  // Use loadUserSettings if user context is available, otherwise fallback to loadSettings
  const settings = user ? await loadUserSettings(user) : await loadSettings();
  const allowEditAllDirectories = settings.system?.allowEditAllDirectories || false;
  
  console.log('[toggleTaskCompletion] Settings check:', {
    allowEditAllDirectories,
    filePath: filePath.substring(0, 50),
    adminToken: settings.system?.adminApiToken ? '[configured]' : '[missing]',
  });
  const isWritable = allowEditAllDirectories || filePath.startsWith('5 - INSIGHTS-IA/');
  
  if (!isWritable) {
    console.log('[toggleTaskCompletion] File is in read-only area:', filePath);
    throw new Error(
      "Esta tarefa está em uma área somente leitura. Para editá-la, abra o arquivo no Obsidian " +
      "ou ative 'Permitir edição em todos os diretórios' nas Configurações do Sistema."
    );
  }

  // If allowEditAllDirectories is enabled, ensure path override is active
  let pathOverrideResult = null;
  if (allowEditAllDirectories && !filePath.startsWith('5 - INSIGHTS-IA/')) {
    console.log('[toggleTaskCompletion] Enabling path override for admin mode');
    try {
      const pathOverrideTTL = settings.system?.pathOverrideTTL || 600;
      const adminToken = settings.system?.adminApiToken;
      
      if (!adminToken) {
        throw new Error('Admin API Token não configurado. Configure em Settings → System → Admin API Token.');
      }
      
      console.log('[toggleTaskCompletion] Admin token available, enabling path override for', pathOverrideTTL, 'seconds');
      pathOverrideResult = await brainCloudClient.enablePathOverride(pathOverrideTTL, adminToken);
      console.log('[toggleTaskCompletion] ✅ Path override enabled successfully', pathOverrideResult);
    } catch (error) {
      console.error('[toggleTaskCompletion] Failed to enable path override:', error.message);
      throw new Error(
        `Falha ao ativar modo admin: ${error.message}`
      );
    }
  }

  const file = await brainCloudClient.getFile(filePath);
  const content = file?.content;

  if (typeof content !== "string") {
    throw new Error("Não foi possível ler o conteúdo da nota associada.");
  }

  // Check if this is a project note (has frontmatter with due date, no lineNumber)
  const isProjectNote = lineNumber === null || lineNumber === undefined || lineNumber === 0;
  const hasFrontmatter = content.startsWith('---');
  
  console.log('[toggleTaskCompletion] Type detection:', { isProjectNote, hasFrontmatter });
  
  if (isProjectNote) {
    if (hasFrontmatter) {
      console.log('[toggleTaskCompletion] Detected project note with frontmatter, updating status field');
      
      // Parse frontmatter and update status field
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatterContent = frontmatterMatch[1];
        
        // Update or add status field
        let updatedFrontmatter;
        if (frontmatterContent.includes('status:')) {
          // Replace existing status
          updatedFrontmatter = frontmatterContent.replace(
            /status:\s*[^\n]*/,
            `status: ${completed ? 'concluída' : 'em_andamento'}`
          );
        } else {
          // Add status field
          updatedFrontmatter = frontmatterContent + `\nstatus: ${completed ? 'concluída' : 'em_andamento'}`;
        }
        
        const newContent = content.replace(
          /^---\n[\s\S]*?\n---/,
          `---\n${updatedFrontmatter}\n---`
        );
        
        await brainCloudClient.writeFile(filePath, newContent, false);
        
        console.log('[toggleTaskCompletion] Project note status updated successfully');
        return {
          success: true,
          filePath,
          completed,
          updatedFrontmatter: true,
          adminModeExpiry: pathOverrideResult?.expires_at || null,
        };
      }
    } else {
      // Project note without frontmatter - add frontmatter
      console.log('[toggleTaskCompletion] Project note without frontmatter, adding frontmatter with status');
      
      const newFrontmatter = `---
status: ${completed ? 'concluída' : 'em_andamento'}
---

`;
      const newContent = newFrontmatter + content;
      await brainCloudClient.writeFile(filePath, newContent, false);
      
      console.log('[toggleTaskCompletion] Added frontmatter with status to project note');
      return {
        success: true,
        filePath,
        completed,
        updatedFrontmatter: true,
        addedFrontmatter: true,
        adminModeExpiry: pathOverrideResult?.expires_at || null,
      };
    }
  }

  // Original checkbox logic for tasks (only for non-project notes)
  const newline = computeNewline(content);
  const lines = content.split(/\r?\n/);
  const targetIndex =
    typeof lineNumber === "number" && Number.isInteger(lineNumber)
      ? Math.min(Math.max(lineNumber, 0), lines.length - 1)
      : null;

  const normalizedTitle = normalizeText(title);
  let updated = false;

  const applyToggleAt = (index) => {
    if (index === null || index < 0 || index >= lines.length) return;
    const { line, updated: lineUpdated } = toggleLine(
      lines[index],
      completed
    );
    if (lineUpdated) {
      lines[index] = line;
      updated = true;
    }
  };

  // 1) primeira tentativa: linha indicada
  applyToggleAt(targetIndex);

  // 2) se não achou, procurar por título próximo
  if (!updated && normalizedTitle) {
    const searchRadius = 6;
    const indicesToCheck = [];
    if (targetIndex !== null) {
      for (let offset = 1; offset <= searchRadius; offset += 1) {
        indicesToCheck.push(targetIndex + offset, targetIndex - offset);
      }
    }

    for (let idx = 0; idx < lines.length && !updated; idx += 1) {
      if (targetIndex !== null && !indicesToCheck.includes(idx)) continue;
      const normalizedLine = normalizeText(lines[idx]);
      if (
        CHECKBOX_REGEX.test(lines[idx]) &&
        normalizedLine.includes(normalizedTitle)
      ) {
        applyToggleAt(idx);
      }
    }
  }

  // 3) fallback final: primeira linha com checkbox após target
  if (!updated) {
    for (let idx = 0; idx < lines.length && !updated; idx += 1) {
      if (CHECKBOX_REGEX.test(lines[idx])) {
        applyToggleAt(idx);
      }
    }
  }

  if (!updated) {
    console.error('[toggleTaskCompletion] Could not find checkbox. Is this a project note?');
    throw new Error(
      "Não foi possível localizar o checkbox da tarefa dentro da nota. Se for uma nota de projeto, ela deve ter frontmatter com campo 'status'."
    );
  }

  const newContent = lines.join(newline);
  await brainCloudClient.writeFile(filePath, newContent, false);

  console.log('[toggleTaskCompletion] Checkbox task updated successfully');
  return {
    success: true,
    filePath,
    completed,
    updatedFrontmatter: false,
    adminModeExpiry: pathOverrideResult?.expires_at || null,
  };
}

export async function getTaskPreferences() {
  return loadTaskPreferences();
}

export async function updateTaskPreferences(preferences = {}) {
  return persistTaskPreferences(preferences);
}

export async function getCriticalTasks({ limit = 10 } = {}) {
  try {
    // Busca todas as tarefas pendentes para que a lógica de filtragem seja feita no backend
    const allPending = await getPendingTasks({ window: "all", limit: 500 });

    // Filtra as tarefas críticas: atrasadas OU vencendo em 3 dias
    const criticalTasks = allPending
      .filter((task) => {
        if (task.is_overdue) return true;
        if (task.days_until_due !== null && task.days_until_due <= 3) return true;
        return false;
      })
      .sort((a, b) => {
        // Prioriza atrasadas, depois as mais próximas do vencimento
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return a.days_until_due - b.days_until_due;
      })
      .slice(0, limit);

    return criticalTasks;
  } catch (error) {
    console.error("[getCriticalTasks] Erro ao buscar tarefas críticas:", error);
    return [];
  }
}

export async function getPendingTasks({ window = "all", limit = 100 } = {}) {
  try {
    const response = await brainCloudClient.getDueTasks({
      window,
      include_completed: false,
      status: "pending", // Ou omitir status para pending/overdue
      limit,
    });
    const items = response?.items || response?.data?.items || [];
    return items;
  } catch (error) {
    console.error("[getPendingTasks] Erro ao buscar tarefas pendentes:", error);
    return [];
  }
}

export async function getCompletedTasks({ window = "week" } = {}) {
  try {
    const response = await brainCloudClient.getDueTasks({
      window,
      include_completed: true,
      status: "completed",
      limit: 200,
    });
    const items = response?.items || response?.data?.items || [];
    return items;
  } catch (error) {
    return [];
  }
}

export async function triggerTasksCleanup({ window = "week" } = {}) {
  // Placeholder implementation – integrates with MCP agents in future iterations.
  return {
    accepted: true,
    window,
    message:
      "AI cleanup agendado. O agente irá analisar as próximas tarefas e sugerir ajustes.",
  };
}

export async function createTask({ title, project, dueDate, priority, user = null }) {
  if (!title) {
    throw new Error("O título da tarefa é obrigatório.");
  }

  // Assumindo que o brainCloudClient expõe a função createNoteFromTemplate
  // e que existe um template chamado "task"
  const templateName = "task";
  const targetPath = "5 - INSIGHTS-IA/Inbox/"; // Local padrão para novas tarefas

  const variables = {
    title: title,
    project: project || "N/A",
    dueDate: dueDate || null,
    priority: priority || "Média",
    // Outras variáveis do template
  };

  try {
    // Assumindo que o brainCloudClient.createNoteFromTemplate é o wrapper para a ferramenta MCP
    const result = await brainCloudClient.createNoteFromTemplate({
      templateName,
      variables,
      targetPath,
      createDirectories: true,
    });

    if (result.success) {
      console.log(`[createTask] Tarefa criada com sucesso: ${result.path}`);
      return {
        success: true,
        path: result.path,
        message: `Tarefa '${title}' criada e salva no vault.`,
      };
    } else {
      throw new Error(result.message || "Falha ao criar a tarefa via Brain Cloud.");
    }
  } catch (error) {
    console.error("[createTask] Erro ao criar tarefa:", error);
    throw new Error(`Erro ao comunicar com o Brain Cloud para criar tarefa: ${error.message}`);
  }
}

export default {
  toggleTaskCompletion,
  getTaskPreferences,
  updateTaskPreferences,
  getCompletedTasks,
  triggerTasksCleanup,
  createTask,
  getPendingTasks,
  getCriticalTasks,
};
