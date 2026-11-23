import path from 'path';
import { test, expect } from '../fixtures/eventia.fixtures';

const adminAuthFile = path.join(__dirname, '../.auth/admin.json');

test.describe('Critical Flow 2: Role-Based Security and 1:1 Moderation', () => {
  test('[Negative] prevents unauthorized anonymous access to moderator dashboard', async ({
    moderatorDashboardPage,
  }) => {
    // Arrange & Act: intentar acceder sin sesión al panel de moderación
    await moderatorDashboardPage.goto();

    // Assert: verificar redirección obligatoria al login
    await expect(moderatorDashboardPage.page).toHaveURL(/\/login/);
  });

  test('[Negative] prevents unauthorized anonymous access to admin dashboard', async ({
    page,
  }) => {
    // Arrange & Act: intentar acceder sin sesión al panel administrativo
    await page.goto('/admin/dashboard');

    // Assert: verificar redirección obligatoria al login
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('Authenticated Administrator Session (storageState)', () => {
    test.use({ storageState: adminAuthFile });

    test.beforeEach(async ({ page }) => {
      // Restaurar tokens de sessionStorage antes de cargar la página protegida
      await page.addInitScript(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('__ss_')) {
            sessionStorage.setItem(
              key.replace('__ss_', ''),
              localStorage.getItem(key) || '',
            );
          }
        }
      });
    });

    test('allows Administrator to access the 1:1 delegation console', async ({
      page,
    }) => {
      // Arrange & Act: navegar al dashboard administrativo con sesión reutilizada
      await page.goto('/admin/dashboard');

      // Assert: confirmar acceso autorizado sin pedir credenciales nuevamente
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });
  });
});