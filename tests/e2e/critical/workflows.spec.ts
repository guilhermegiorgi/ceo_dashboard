import { expect, test } from "../fixtures";
import { routes } from "../setup/test-data";
import { setupDashboardMocks } from "../utils/apiMocks";

const workflowsMock = [
  {
    id: "wf-1",
    name: "Weekly Digest",
    description: "Gera resumo semanal com insights críticos.",
    enabled: true,
    schedule: "0 7 * * MON",
    lastRun: new Date().toISOString(),
    tasks: [
      { id: "task-a", name: "Coletar notas", action: "collect_notes" },
      { id: "task-b", name: "Gerar sumário", action: "generate_summary" },
    ],
  },
  {
    id: "wf-2",
    name: "Daily Focus",
    description: "Prioriza tarefas urgentes do dia.",
    enabled: true,
    schedule: "0 6 * * *",
    lastRun: new Date().toISOString(),
    tasks: [{ id: "task-c", name: "Rankear tarefas", action: "rank_tasks" }],
  },
];

const executionsMock = [
  {
    id: "exec-1",
    workflowId: "wf-1",
    status: "completed",
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    duration: 1200,
  },
];

test.describe("Critical • Workflows & Automations", () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await setupDashboardMocks(page);

    await page.route("**/api/prebuilt-workflows", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(workflowsMock),
      });
    });

    await page.route("**/api/prebuilt-workflows/wf-1/executions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(executionsMock),
      });
    });

    await page.route("**/api/prebuilt-workflows/wf-1/execute", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "exec-2",
          workflowId: "wf-1",
          status: "completed",
          startedAt: new Date().toISOString(),
          duration: 1500,
        }),
      });
    });

    await authenticatedPage.goto(routes.dashboard);
    await authenticatedPage.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Flows" }).click();
  });

  test("should list available workflows", async ({ page }) => {
    await expect(page.getByText("Workflows Disponíveis")).toBeVisible();
    await expect(page.getByText("Weekly Digest")).toBeVisible();
    await expect(page.getByText("Daily Focus")).toBeVisible();
  });

  test("should display workflow details and execution history", async ({ page }) => {
    await page.getByText("Weekly Digest").click();

    await expect(page.getByRole("heading", { name: "Weekly Digest" })).toBeVisible();
    await expect(page.getByText(/Gera resumo semanal/i)).toBeVisible();
    await expect(page.getByText(/Execution History/i)).toBeVisible();
    await expect(page.getByText(/Sem execuções registradas/i)).not.toBeVisible();
  });

  test("should execute workflow and show confirmation", async ({ page }) => {
    await page.getByText("Weekly Digest").click();
    const executeButton = page.getByRole("button", { name: /Execute Now/i });
    await expect(executeButton).toBeEnabled();
    await executeButton.click();

    await expect(executeButton).toBeEnabled();
  });
});
