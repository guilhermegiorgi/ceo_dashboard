import type { Page, Route } from "@playwright/test";

type DashboardSnapshot = Record<string, unknown>;
type TaskPreferences = {
  viewMode: "list" | "kanban";
  sortBy: "natural" | "due" | "priority" | "project";
  boardOrder: Record<string, string[]>;
  pinnedTaskIds: string[];
  priorityMap: Record<string, string | null | undefined>;
  contextTemplate?: Record<string, unknown>;
};

const defaultSnapshot: DashboardSnapshot = {
  generatedAt: new Date().toISOString(),
  data: {
    focus: {
      daily_notes: [
        {
          title: "Prioridades estratégicas do dia",
          excerpt: "Alinhar iniciativas de crescimento e revisar métricas críticas.",
        },
      ],
      weekly_focus: {
        title: "Weekly Focus",
        excerpt: "Priorizar integração Brain Cloud + fluxos de automação.",
        modified: new Date().toISOString(),
        tags: ["estratégia", "automação"],
      },
      metadata: {
        weekly_goal: "Realinhar operações com metas do trimestre",
      },
    },
    tasks: {
      simplified: [
        {
          id: "task-1",
          title: "Revisar roadmap dos agentes",
          status: "today",
          dueDate: new Date().toISOString(),
          dueTime: "10:00",
          project: "Agent Orchestrator",
          priority: "p1",
          tags: ["#prioridade", "#agentes"],
          filePath: "notes/tasks/roadmap.md",
          sourceType: "tasks",
          headingContext: "Prioridades agentes",
          lineNumber: 12,
        },
        {
          id: "task-2",
          title: "Documentar fluxos de workflows",
          status: "upcoming",
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          project: "Workflows",
          priority: "p2",
          tags: ["#documentação"],
          filePath: "notes/tasks/workflows.md",
          sourceType: "tasks",
          headingContext: "Workflows",
          lineNumber: 44,
        },
        {
          id: "task-3",
          title: "Validar insights Brain Cloud",
          status: "overdue",
          dueDate: new Date(Date.now() - 86400000).toISOString(),
          project: "Brain Cloud",
          priority: "p1",
          tags: ["#braincloud"],
          filePath: "notes/tasks/insights.md",
          sourceType: "tasks",
          headingContext: "Insights",
          lineNumber: 7,
        },
      ],
      metrics: {
        overdue: 1,
        dueToday: 1,
        upcoming: 1,
      },
      summary: {
        recommendations: [
          "Priorize revisar o roadmap dos agentes antes da próxima daily.",
        ],
      },
    },
    timeContext: {
      recent_activities: [
        {
          title: "Nota atualizada: Daily Focus",
          summary: "Resumo diário alinhado com novas prioridades.",
          tags: ["daily", "foco"],
          modified: new Date().toISOString(),
        },
      ],
      upcoming_deadlines: [
        {
          title: "Entrega de playbook MCP",
          due_date: new Date(Date.now() + 86400000).toISOString(),
          due_time: "16:00",
        },
      ],
    },
    conversations: {
      threads: [
        {
          id: "thread-1",
          title: "Alinhamento semanal",
          summary: "Recapitular objetivos e riscos estratégicos.",
          updatedAt: new Date().toISOString(),
          messageCount: 6,
          tags: ["weekly"],
        },
      ],
    },
  },
};

const defaultTaskPreferences: TaskPreferences = {
  viewMode: "list",
  sortBy: "natural",
  boardOrder: {
    overdue: ["task-3"],
    today: ["task-1"],
    upcoming: ["task-2"],
  },
  pinnedTaskIds: [],
  priorityMap: {
    "task-1": "p1",
    "task-2": "p2",
    "task-3": "p1",
  },
};

const defaultGraph = {
  nodes: [
    { id: "1", label: "OKR 2025" },
    { id: "2", label: "Projeto Atlas" },
    { id: "3", label: "Insight IA" },
  ],
  edges: [
    { source: "1", target: "2", type: "link" },
    { source: "2", target: "3", type: "observation" },
  ],
};

type SetupOptions = {
  snapshot?: DashboardSnapshot;
  taskPreferences?: Partial<TaskPreferences>;
  graph?: Record<string, unknown>;
};

const jsonResponse = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

export async function setupDashboardMocks(
  page: Page,
  options: SetupOptions = {}
): Promise<void> {
  let currentSnapshot = options.snapshot ?? defaultSnapshot;
  let currentTaskPreferences: TaskPreferences = {
    ...defaultTaskPreferences,
    ...(options.taskPreferences ?? {}),
  };
  const currentGraph = options.graph ?? defaultGraph;

  await page.route("**/api/dashboard/today**", async (route) => {
    await jsonResponse(route, currentSnapshot);
  });

  await page.route("**/api/settings/dashboard/collections**", async (route) => {
    await jsonResponse(route, { collections: [] });
  });

  await page.route("**/api/tasks/preferences**", async (route) => {
    if (route.request().method() === "GET") {
      await jsonResponse(route, { data: currentTaskPreferences });
      return;
    }

    try {
      const payload = route.request().postDataJSON?.() as Partial<TaskPreferences> | undefined;
      if (payload) {
        currentTaskPreferences = {
          ...currentTaskPreferences,
          ...payload,
          boardOrder: payload.boardOrder ?? currentTaskPreferences.boardOrder,
          pinnedTaskIds:
            payload.pinnedTaskIds ?? currentTaskPreferences.pinnedTaskIds,
          priorityMap:
            payload.priorityMap ?? currentTaskPreferences.priorityMap,
        };
      }
    } catch {
      // no-op fallback when body is not JSON
    }

    await jsonResponse(route, { data: currentTaskPreferences });
  });

  await page.route("**/api/brain/context**", async (route) => {
    await jsonResponse(route, { results: [] });
  });

  await page.route("**/api/brain/graph**", async (route) => {
    await jsonResponse(route, currentGraph);
  });

  await page.route("**/api/tasks/toggle**", async (route) => {
    await jsonResponse(route, { success: true });
  });

  await page.route("**/api/vault/notes/**", async (route) => {
    await jsonResponse(route, {
      path: "notes/tasks/mock.md",
      data: {
        content: "# Nota de tarefa\n\nConteúdo simulado para testes E2E.",
        title: "Nota de tarefa mock",
      },
    });
  });

  await page.route("**/api/**", async (route) => {
    // Generic stub for remaining API calls to keep the dashboard stable during tests.
    const method = route.request().method();
    if (method === "GET") {
      await jsonResponse(route, {});
      return;
    }

    await jsonResponse(route, { success: true });
  });
}
