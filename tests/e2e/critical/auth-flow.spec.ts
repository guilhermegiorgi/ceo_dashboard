import { test, expect } from '../fixtures';
import { selectors, routes } from '../setup/test-data';

test.describe('Fluxo crítico • Autenticação', () => {
  test('Usuário consegue entrar via email/senha e acessar o dashboard', async ({
    page,
    login,
  }) => {
    await login();

    await expect(page).toHaveURL(new RegExp(`${routes.dashboard}$`));
    await expect(
      page.getByPlaceholder(selectors.dashboardSearchPlaceholder)
    ).toBeVisible();
  });
});
