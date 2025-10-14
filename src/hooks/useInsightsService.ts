import { useCallback } from "react";
import { useAPI } from "./useAPI";

type ActionPlanPriority = "high" | "medium" | "low";

export interface ActionPlanPayload {
  title: string;
  tasks: string[];
  assignedProject: string;
  priority: ActionPlanPriority;
  deadline?: string;
}

export const useInsights = () => {
  const api = useAPI();

  const createActionPlan = useCallback(
    async (insightId: string, plan: ActionPlanPayload) => {
      const descriptionSections = [
        `Plano de ação criado para o insight ${insightId}.`,
        `Projeto associado: ${plan.assignedProject || "não definido"}.`,
        `Prioridade: ${plan.priority}.`,
        plan.deadline ? `Prazo: ${plan.deadline}.` : "",
        "",
        "## Tarefas",
        ...plan.tasks.map((task, index) => `${index + 1}. ${task}`),
      ].filter(Boolean);

      await api.request("/api/feedback-actions", {
        method: "POST",
        body: {
          type: "action_taken",
          title: plan.title,
          description: descriptionSections.join("\n"),
          relatedProject: plan.assignedProject,
          impact: plan.priority,
        },
      });
    },
    [api]
  );

  return { createActionPlan };
};

export const useObsidian = () => {
  const api = useAPI();

  const createNote = useCallback(
    async (title: string, content: string, folder?: string) => {
      return api.request("/api/obsidian/note", {
        method: "POST",
        body: {
          title,
          content,
          folder,
        },
      });
    },
    [api]
  );

  return { createNote };
};
