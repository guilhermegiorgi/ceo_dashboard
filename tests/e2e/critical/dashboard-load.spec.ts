import { expect, test } from "../fixtures";
import { routes } from "../setup/test-data";
import { setupDashboardMocks } from "../utils/apiMocks";

test.describe("Critical • Dashboard Loading", () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await setupDashboardMocks(page);
    await page.addInitScript(() => {
      // Prevent EventSource connections during tests
      class MockEventSource {
        constructor() {}
        close() {}
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onopen: ((event: Event) => void) | null = null;
      }
      // @ts-expect-error - override on window for tests
      window.EventSource = MockEventSource;
    });
    await authenticatedPage.goto(routes.dashboard);
    await authenticatedPage.waitForLoadState("networkidle");
  });

  test("should render focus overview and operational panels", async ({ page }) => {
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByText(/Foco do dia/i)).toBeVisible();
    await expect(page.getByText(/Painel Operacional/i)).toBeVisible();
    await expect(page.getByText(/Timeline IA/i)).toBeVisible();
  });

  test("should render without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });

    await page.reload({ waitUntil: "networkidle" });

    expect(errors).toEqual([]);
  });

  test("performance: dashboard loads under performance baseline", async ({ page }) => {
    const startedAt = Date.now();
    await page.reload({ waitUntil: "networkidle" });
    const loadTime = Date.now() - startedAt;

    // Baseline threshold keeps tests stable while flagging regressions.
    expect(loadTime).toBeLessThan(5000);
  });
});
