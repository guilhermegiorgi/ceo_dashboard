import { expect, Page, test as setup } from "@playwright/test";
import { defaultCredentials, routes, selectors } from "./test-data";

export async function loginViaUI(page: Page): Promise<void> {
  await page.goto(routes.login);

  await page.getByLabel("Email").fill(defaultCredentials.email);
  await page.getByLabel("Senha").fill(defaultCredentials.password);

  await Promise.all([
    page.waitForURL(`**${routes.dashboard}`),
    page.getByRole("button", { name: selectors.loginButton }).click(),
  ]);

  await expect(
    page.getByPlaceholder(selectors.dashboardSearchPlaceholder)
  ).toBeVisible({ timeout: 15_000 });
}

export async function ensureStorageState(
  page: Page,
  storagePath: string
): Promise<void> {
  await loginViaUI(page);
  await page.context().storageState({ path: storagePath });
}

setup("authenticate", async ({ page }) => {
  await ensureStorageState(page, "tests/e2e/.auth/user.json");
});
