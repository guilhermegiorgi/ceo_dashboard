import { expect, test } from "../fixtures";
import { routes } from "../setup/test-data";
import { setupDashboardMocks } from "../utils/apiMocks";

const graphNodesResponse = {
  nodes: [
    { id: "1", label: "Insight IA", tags: ["ia"], type: "insight" },
    { id: "2", label: "Projeto Atlas", tags: ["projeto"], type: "project" },
  ],
  edges: [{ source: "1", target: "2" }],
};

test.describe("Performance • Lazy Loading", () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await setupDashboardMocks(page);

    await page.route("**/api/knowledge-graph/nodes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(graphNodesResponse),
      });
    });

    await authenticatedPage.goto(routes.dashboard);
    await authenticatedPage.waitForLoadState("networkidle");
  });

  test("should lazy load knowledge graph utility", async ({ page }) => {
    await expect(page.getByText(/Knowledge Graph Visualizer/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Graph" }).click();

    await expect(page.getByText(/Knowledge Graph Visualizer/i)).toBeVisible();
  });

  test("should lazy load analytics dashboard", async ({ page }) => {
    await expect(page.getByText(/Analytics Dashboard/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Analytics" }).click();

    await expect(page.getByText(/Analytics Dashboard/i)).toBeVisible();
  });
});
