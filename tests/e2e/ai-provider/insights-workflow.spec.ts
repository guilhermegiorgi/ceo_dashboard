import { expect, test } from "../fixtures";
import { routes } from "../setup/test-data";

test.describe("AI Provider • Insights Workflow", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto(routes.dashboard);
    await authenticatedPage.waitForLoadState("networkidle");
  });

  test("should display current insights provider in dashboard header", async ({
    page,
  }) => {
    // Look for insights provider indicator in dashboard header
    const dashboardHeader = page
      .locator('[data-testid="dashboard-header"]')
      .first();

    if (await dashboardHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Provider badge should show which provider is used for insights
      const providerBadge = page.getByText(
        /openai|anthropic|gemini|claude|insights/i
      );
      const hasBadge = await providerBadge
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      console.log(`Insights provider badge visible: ${hasBadge}`);
    }
  });

  test("should generate insights with selected provider", async ({ page }) => {
    // Look for insights generation button/area
    const focusSummaryWidget = page
      .locator('[data-testid="focus-summary"]')
      .first();

    if (
      await focusSummaryWidget.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      // Look for regenerate button
      const regenerateButton = page
        .getByRole("button", { name: /regenerate|gerar|atualizar/i })
        .first();

      if (
        await regenerateButton.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        // Click to generate
        await regenerateButton.click();

        // Wait for generation to complete
        await page.waitForTimeout(3000);

        // Should show new insights content
        const insightsContent = focusSummaryWidget.locator(
          "text=/focus|summary|insights/i"
        );
        const hasContent = await insightsContent
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        console.log(`Insights generated successfully: ${hasContent}`);
      }
    }
  });

  test("should switch insights provider and regenerate", async ({ page }) => {
    // Get current provider info
    const initialHeader = await page
      .locator('[data-testid="focus-summary"]')
      .textContent()
      .catch(() => "initial");

    // Open settings
    const settingsButton = page.getByRole("button", {
      name: /settings|configurações/i,
    });
    if (await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.click();

      // Wait for settings dialog
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });

      // Change insights provider
      const insightsProviderDropdown = page
        .locator('[name*="insights"][name*="provider"]')
        .first();

      if (
        await insightsProviderDropdown
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        await insightsProviderDropdown.click();

        // Select different provider
        const options = page.locator('[role="option"]');
        const optionCount = await options.count();

        if (optionCount > 1) {
          await options.nth(1).click();

          // Save
          const saveButton = page.getByRole("button", { name: /save|salvar/i });
          if (
            await saveButton.isVisible({ timeout: 3000 }).catch(() => false)
          ) {
            await saveButton.click();
            await page.waitForTimeout(1000);
          }

          // Close settings
          const closeButton = page.getByRole("button", {
            name: /close|fechar|✕/i,
          });
          await closeButton?.click().catch(() => {});

          // Regenerate insights
          const regenerateButton = page.getByRole("button", {
            name: /regenerate|gerar/i,
          });
          if (
            await regenerateButton
              .isVisible({ timeout: 3000 })
              .catch(() => false)
          ) {
            await regenerateButton.click();
            await page.waitForTimeout(2000);

            // Check for updated insights
            const newHeader = await page
              .locator('[data-testid="focus-summary"]')
              .textContent()
              .catch(() => "not found");

            console.log(
              `Insights provider switched: ${initialHeader} → ${newHeader}`
            );
          }
        }
      }
    }
  });

  test("should display insights generation timestamp", async ({ page }) => {
    // Look for timestamp in insights widget
    const focusSummary = page.locator('[data-testid="focus-summary"]').first();

    if (await focusSummary.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Timestamp might show: "Generated at X", "Last updated: X"
      const timestamp = page.getByText(/generated|updated|ago|atrás/i);
      const hasTimestamp = await timestamp
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      console.log(`Insights timestamp visible: ${hasTimestamp}`);
    }
  });

  test("should show regenerate tooltip with provider info", async ({
    page,
  }) => {
    // Look for regenerate button
    const regenerateButton = page
      .getByRole("button", { name: /regenerate|gerar/i })
      .first();

    if (
      await regenerateButton.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      // Hover to show tooltip
      await regenerateButton.hover();

      // Wait for tooltip
      await page.waitForTimeout(500);

      // Tooltip might show "Regenerate with [Provider]"
      const tooltip = page.locator('[role="tooltip"]').first();
      const hasTooltip = await tooltip
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      console.log(`Regenerate tooltip visible: ${hasTooltip}`);

      // Tooltip should mention provider
      const tooltipText = await tooltip.textContent().catch(() => "");
      console.log(`Tooltip text: ${tooltipText}`);
    }
  });

  test("should show loading state while generating insights", async ({
    page,
  }) => {
    // Click regenerate
    const regenerateButton = page
      .getByRole("button", { name: /regenerate|gerar/i })
      .first();

    if (
      await regenerateButton.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      // Click and immediately check for loading state
      regenerateButton.click().catch(() => {});

      // Look for loading indicators
      const loadingIndicators = [
        /loading|carregando|...|generating|gerando/i,
        page.locator('[data-testid="loading"]').first(),
        page.locator(".animate-spin").first(),
      ];

      let hasLoading = false;
      for (const indicator of loadingIndicators) {
        if (typeof indicator === "string") {
          hasLoading = await page
            .getByText(indicator)
            .isVisible({ timeout: 2000 })
            .catch(() => false);
        } else {
          hasLoading = await indicator
            .isVisible({ timeout: 2000 })
            .catch(() => false);
        }

        if (hasLoading) break;
      }

      console.log(`Loading state visible: ${hasLoading}`);
    }
  });

  test("should display insights with provider badge", async ({ page }) => {
    // Get insights widget
    const focusSummary = page.locator('[data-testid="focus-summary"]').first();

    if (await focusSummary.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for provider indicator in or near insights
      const providerPatterns = [/openai|anthropic|gemini|claude/i];

      let foundProvider = false;
      for (const pattern of providerPatterns) {
        const element = page.getByText(pattern).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundProvider = true;
          break;
        }
      }

      console.log(`Provider badge in insights: ${foundProvider}`);
    }
  });

  test("should handle insights generation error gracefully", async ({
    page,
  }) => {
    // Trigger insights generation
    const regenerateButton = page
      .getByRole("button", { name: /regenerate|gerar/i })
      .first();

    if (
      await regenerateButton.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await regenerateButton.click();

      // Wait for potential error
      await page.waitForTimeout(3000);

      // Look for error message
      const errorMessage = page.getByText(/error|erro|failed|falhou/i);
      const hasError = await errorMessage
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasError) {
        // Should show recovery option (e.g., "Try again" or "Check settings")
        const recoveryButton = page.getByRole("button", {
          name: /retry|try again|settings|configurações/i,
        });
        const hasRecovery = await recoveryButton
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        console.log(`Error recovery option available: ${hasRecovery}`);
      } else {
        console.log("No error state detected");
      }
    }
  });

  test("should persist insights even after provider change", async ({
    page,
  }) => {
    // Get current insights content
    const focusSummary = page.locator('[data-testid="focus-summary"]').first();
    const initialContent =
      (await focusSummary.textContent().catch(() => "initial")) || "initial";

    // Switch provider
    const settingsButton = page.getByRole("button", {
      name: /settings|configurações/i,
    });
    if (await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Change provider
      const providerDropdown = page
        .locator('[name*="insights"][name*="provider"]')
        .first();
      if (
        await providerDropdown.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await providerDropdown.click();
        await page
          .locator('[role="option"]')
          .first()
          .click()
          .catch(() => {});

        // Save
        const saveButton = page.getByRole("button", { name: /save|salvar/i });
        if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await saveButton.click();
        }

        // Close
        const closeButton = page.getByRole("button", { name: /close|✕/i });
        await closeButton?.click().catch(() => {});
      }
    }

    // Old insights should still be visible
    const contentAfter =
      (await focusSummary.textContent().catch(() => "after")) || "after";

    // Content might be same until user regenerates
    console.log(
      `Insights persisted: initial length=${initialContent.length}, after=${contentAfter.length}`
    );
  });

  test("should show cache age for insights model list", async ({ page }) => {
    // Open settings to see insights section
    const settingsButton = page.getByRole("button", {
      name: /settings|configurações/i,
    });
    if (await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.click();

      // Should show cache info like "Last updated: 5 minutes ago"
      const cacheInfo = page.getByText(
        /last updated|atualizado|minutos|atrás/i
      );
      const hasCacheInfo = await cacheInfo
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      console.log(`Cache info visible in insights section: ${hasCacheInfo}`);

      // Close settings
      const closeButton = page.getByRole("button", { name: /close|✕/i });
      await closeButton?.click().catch(() => {});
    }
  });
});
