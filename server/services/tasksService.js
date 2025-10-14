import brainCloudClient from "./brainCloudClient.js";
import {
  getTaskPreferences as loadTaskPreferences,
  updateTaskPreferences as persistTaskPreferences,
} from "./settingsService.js";

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
}) {
  if (!filePath) {
    throw new Error("filePath é obrigatório para atualizar uma tarefa.");
  }

  const file = await brainCloudClient.getFile(filePath);
  const content = file?.content;

  if (typeof content !== "string") {
    throw new Error("Não foi possível ler o conteúdo da nota associada.");
  }

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
    throw new Error(
      "Não foi possível localizar o checkbox da tarefa dentro da nota."
    );
  }

  const newContent = lines.join(newline);
  await brainCloudClient.writeFile(filePath, newContent, false);

  return {
    success: true,
    filePath,
    completed,
  };
}

export async function getTaskPreferences() {
  return loadTaskPreferences();
}

export async function updateTaskPreferences(preferences = {}) {
  return persistTaskPreferences(preferences);
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

export default {
  toggleTaskCompletion,
  getTaskPreferences,
  updateTaskPreferences,
  getCompletedTasks,
  triggerTasksCleanup,
};
