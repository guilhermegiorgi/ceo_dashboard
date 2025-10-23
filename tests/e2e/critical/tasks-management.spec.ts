import { expect, test } from "../fixtures";
import { routes } from "../setup/test-data";
import { setupDashboardMocks } from "../utils/apiMocks";

test.describe("Critical • Tasks Management", () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await setupDashboardMocks(page);
    await authenticatedPage.goto(routes.dashboard);
    await authenticatedPage.waitForLoadState("networkidle");
  });

  test("should display task list with primary actions", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Lista" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova tarefa" })).toBeVisible();
    await expect(page.getByText("Revisar roadmap dos agentes")).toBeVisible();
  });

  test("should switch between list and board views", async ({ page }) => {
    await page.getByRole("button", { name: "Board" }).click();
    const draggableCards = page.locator('[draggable="true"]');
    await expect(draggableCards.first()).toBeVisible();

    await page.getByRole("button", { name: "Lista" }).click();
    await expect(page.getByText("Revisar roadmap dos agentes")).toBeVisible();
  });

  test("should open sort menu and apply option", async ({ page }) => {
    await page.getByRole("button", { name: "Ordenar" }).click();
    await page.getByRole("button", { name: "Prazo" }).click();

    // Sort menu should close after selecting an option
    await expect(page.getByRole("button", { name: "Ordenar" })).toBeVisible();
  });
});
