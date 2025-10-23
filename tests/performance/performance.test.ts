import { test } from "../e2e/fixtures";
import { routes } from "../e2e/setup/test-data";
import { setupDashboardMocks } from "../e2e/utils/apiMocks";

test("measure dashboard performance", async ({ page, authenticatedPage }) => {
  await setupDashboardMocks(page);

  const metrics = {
    pageLoadTime: 0,
    navigationTiming: 0,
    paintTimings: [] as Array<{ name: string; startTime: number }>,
  };

  const startTime = Date.now();
  await authenticatedPage.goto(routes.dashboard);
  await authenticatedPage.waitForLoadState("networkidle");
  metrics.pageLoadTime = Date.now() - startTime;

  const performanceData = await page.evaluate(() => {
    const navigationEntries = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    const paintEntries = performance.getEntriesByType("paint") as PerformanceEntry[];

    return {
      navigationTiming:
        navigationEntries[0]?.loadEventEnd && navigationEntries[0]?.startTime !== undefined
          ? navigationEntries[0].loadEventEnd - navigationEntries[0].startTime
          : 0,
      paintTiming: paintEntries.map((entry) => ({
        name: entry.name,
        startTime: entry.startTime,
      })),
    };
  });

  metrics.navigationTiming = performanceData.navigationTiming;
  metrics.paintTimings = performanceData.paintTiming;

  console.log("Performance Data:", {
    ...metrics,
  });

  // Baseline guardrail for CI. Adjust as the application evolves.
  if (metrics.pageLoadTime > 6000) {
    throw new Error(
      `Dashboard load time regression detected: ${metrics.pageLoadTime}ms`
    );
  }
});
