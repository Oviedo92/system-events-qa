import { test, expect } from '../fixtures/eventia.fixtures';

test.describe('AI-Assisted Suite 2: Catalog Filter Reset and Promoter Route Guard', () => {
  test('resets search input and keeps default city filter when clicking clear filters', async ({
    eventsCatalogPage,
  }) => {
    // Arrange: cargar el catálogo público de eventos
    await eventsCatalogPage.goto();
    await eventsCatalogPage.searchByKeyword('Festival');
    await expect(eventsCatalogPage.searchInput).toHaveValue('Festival');

    // Act: accionar el botón de limpiar filtros encapsulado en el Page Object
    await eventsCatalogPage.clearFilters();

    // Assert: confirmar restablecimiento de búsqueda y selector de ciudad
    await expect(eventsCatalogPage.searchInput).toHaveValue('');
    await expect(eventsCatalogPage.citySelect).toHaveValue('ALL');
  });

  test('[Negative] redirects unauthenticated user from promoter dashboard to login', async ({
    page,
  }) => {
    // Arrange & Act: intentar acceder sin sesión al panel de promotor
    await page.goto('/promoter/dashboard');

    // Assert: validar bloqueo de ruta protegida y redirección a /login
    await expect(page).toHaveURL(/\/login/);
  });
});