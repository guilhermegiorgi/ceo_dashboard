import { expect, test } from "../fixtures";
import { routes } from "../setup/test-data";
import { setupDashboardMocks } from "../utils/apiMocks";

test.describe("Critical • Chat Functionality", () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await setupDashboardMocks(page);
    await authenticatedPage.goto(routes.dashboard);
    await authenticatedPage.waitForLoadState("networkidle");
  });

  test("should expand chat widget and expose composer", async ({ page }) => {
    const expandButton = page.getByRole("button", { name: /expandir chat/i });
    await expect(expandButton).toBeVisible();
    await expandButton.click();

    const composer = page.getByPlaceholder("Pergunte, capture uma nota ou gere um insight...");
    await expect(composer).toBeVisible();

    await composer.fill("Quais são as prioridades de hoje?");
    await expect(composer).toHaveValue("Quais são as prioridades de hoje?");
  });

  test("should toggle shortcuts panel", async ({ page }) => {
    await page.getByRole("button", { name: /expandir chat/i }).click();

    const shortcutsToggle = page.getByRole("button", { name: /F1: Atalhos/i });
    await expect(shortcutsToggle).toBeVisible();
    await shortcutsToggle.click();

    await expect(page.getByText(/Atalhos Rápidos/i)).toBeVisible();
  });
});
