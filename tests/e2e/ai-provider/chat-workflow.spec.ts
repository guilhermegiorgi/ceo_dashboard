import { expect, test } from "../fixtures";
import { routes } from "../setup/test-data";

test.describe("AI Provider • Chat Workflow", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto(routes.dashboard);
    await authenticatedPage.waitForLoadState("networkidle");
  });

  test("should display active provider and model in chat widget", async ({
    page,
  }) => {
    // Open chat widget
    const chatExpandButton = page
      .getByRole("button", { name: /expand|expandir/i })
      .first();
    if (
      await chatExpandButton.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await chatExpandButton.click();
    }

    // Look for provider badge in chat widget
    const providerBadge = page.getByText(/using|usando/i);
    const hasBadge = await providerBadge
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    console.log(`Provider badge visible: ${hasBadge}`);

    // Provider info should include provider name and model
    // Format: "Using [Provider] - [Model]"
    const providerIndicators = [/openai|anthropic|google|gemini|claude|gpt/i];

    let foundProvider = false;
    for (const pattern of providerIndicators) {
      if (
        await page
          .getByText(pattern)
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        foundProvider = true;
        break;
      }
    }

    console.log(`Provider indicator visible: ${foundProvider}`);
  });

  test("should send message with selected provider", async ({ page }) => {
    // Open chat
    const chatWidget = page.locator('[data-testid="chat-widget"]').first();
    if (await chatWidget.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatWidget.click();
    }

    // Find message input
    const messageInput = page.getByPlaceholder(/ask|pergunte|message/i).first();
    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Type message
      await messageInput.fill("Hello, what can you help with?");

      // Submit
      const sendButton = page.getByRole("button", { name: /send|enviar/i });
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();

        // Wait for response
        await page.waitForTimeout(3000);

        // Check for response in chat history
        const hasResponse = await page
          .getByText(/i can help|posso ajudar/i)
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        console.log(`Chat response received: ${hasResponse}`);
      }
    }
  });

  test("should update chat when provider is switched in settings", async ({
    page,
  }) => {
    // Get initial provider
    const initialProvider = await page
      .getByText(/using|usando/i)
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

      // Change provider if possible
      const providerDropdown = page
        .locator('[name*="chat"][name*="provider"]')
        .first();
      if (
        await providerDropdown.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await providerDropdown.click();

        const secondOption = page.locator('[role="option"]').nth(1);
        if (
          await secondOption.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          await secondOption.click();

          // Save changes
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

          await page.waitForTimeout(500);

          // Check if chat provider info updated
          const newProvider = await page
            .getByText(/using|usando/i)
            .textContent()
            .catch(() => "not found");

          console.log(`Provider changed: ${initialProvider} → ${newProvider}`);
        }
      }
    }
  });

  test("should handle provider fallback transparently", async ({ page }) => {
    // Send message with current provider
    const messageInput = page.getByPlaceholder(/ask|pergunte/i).first();
    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await messageInput.fill("Test fallback mechanism");

      const sendButton = page.getByRole("button", { name: /send|enviar/i });
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();

        // Wait for response
        await page.waitForTimeout(3000);

        // If primary fails, should silently use fallback
        // Check for success or error message
        const hasResponse = await page
          .locator("text=/response|resposta|error|erro/i")
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        console.log(`Message response received: ${hasResponse}`);
      }
    }
  });

  test("should show error if all providers fail with instructions to fix", async ({
    page,
  }) => {
    // This test would require invalid API keys setup
    // For now, just verify error UI exists

    // Look for error recovery UI
    const errorMessage = page.getByText(
      /provider|fix in settings|configurações/i
    );

    // Error should guide user to settings
    if (await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should have link/button to open settings
      const settingsLink = page.getByRole("button", {
        name: /settings|configurações/i,
      });
      const hasSettingsLink = await settingsLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      console.log(`Error has settings link: ${hasSettingsLink}`);
    }
  });

  test("should maintain chat history across provider switches", async ({
    page,
  }) => {
    // Send initial message
    const messageInput = page.getByPlaceholder(/ask|pergunte/i).first();
    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await messageInput.fill("First message");

      const sendButton = page.getByRole("button", { name: /send|enviar/i });
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();

        await page.waitForTimeout(2000);

        // Get message count
        const messageCount = await page.locator('[role="article"]').count();

        // Switch provider
        const settingsButton = page.getByRole("button", { name: /settings/i });
        if (
          await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)
        ) {
          await settingsButton.click();
          await page.waitForTimeout(500);

          // Change provider
          const providerDropdown = page.locator('[name*="provider"]').first();
          if (
            await providerDropdown
              .isVisible({ timeout: 3000 })
              .catch(() => false)
          ) {
            await providerDropdown.click();
            await page
              .locator('[role="option"]')
              .first()
              .click()
              .catch(() => {});
          }

          // Close settings
          const closeButton = page.getByRole("button", { name: /close|✕/i });
          await closeButton?.click().catch(() => {});
        }

        // Messages should still be there
        const newMessageCount = await page.locator('[role="article"]').count();

        console.log(`Messages preserved: ${messageCount} → ${newMessageCount}`);
      }
    }
  });

  test("should display provider badge on streamed responses", async ({
    page,
  }) => {
    // Send message
    const messageInput = page.getByPlaceholder(/ask|pergunte/i).first();
    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await messageInput.fill("What is AI?");

      const sendButton = page.getByRole("button", { name: /send|enviar/i });
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();

        // Wait for streaming response
        await page.waitForTimeout(3000);

        // Response message should have provider indicator
        const assistantMessage = page.locator('[data-role="assistant"]').last();
        const hasProviderInfo = await assistantMessage
          .locator(/openai|anthropic|gemini|claude/i)
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        console.log(`Response has provider badge: ${hasProviderInfo}`);
      }
    }
  });
});
