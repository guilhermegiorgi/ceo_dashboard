import { expect, test } from "../fixtures";
import { setupDashboardMocks } from "../utils/apiMocks";

const mockGraph = {
  nodes: [
    { id: "1", label: "OKR 2025" },
    { id: "2", label: "Projeto Atlas" },
    { id: "3", label: "Insight MCP" },
  ],
  edges: [
    { source: "1", target: "2", type: "relation" },
    { source: "2", target: "3", type: "insight" },
  ],
};

test.describe("Critical • Knowledge Graph", () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await setupDashboardMocks(page, { graph: mockGraph });
    await authenticatedPage.goto("/knowledge-graph");
    await authenticatedPage.waitForLoadState("networkidle");
  });

  test("should load and render graph nodes", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Knowledge Graph/i })).toBeVisible();

    const nodeLocator = page.locator("svg circle");
    await expect(nodeLocator).toHaveCount(mockGraph.nodes.length);
  });

  test("should display node details when a node is selected", async ({ page }) => {
    const node = page.locator("svg circle").first();
    await node.click();

    await expect(page.getByText("OKR 2025")).toBeVisible();
    await expect(page.getByText(/Importância:/i)).toBeVisible();
  });

  test("performance: graph view renders within baseline", async ({ page }) => {
    const startedAt = Date.now();
    await page.reload({ waitUntil: "networkidle" });
    const renderTime = Date.now() - startedAt;

    expect(renderTime).toBeLessThan(4000);
  });
});
