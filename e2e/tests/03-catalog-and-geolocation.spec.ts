import { test, expect } from '../fixtures/eventia.fixtures';

test.describe('Critical Flow 3: Public Event Catalog and Geolocation Detail', () => {
  test('loads the public active events catalog', async ({
    eventsCatalogPage,
  }) => {
    // Arrange & Act: visitar la cartelera pública de eventos
    await eventsCatalogPage.goto();

    // Assert: verificar que el contenedor principal del catálogo sea visible
    await expect(eventsCatalogPage.catalogSection).toBeVisible();
  });

  test('allows filtering events through the catalog search input', async ({
    eventsCatalogPage,
  }) => {
    // Arrange: abrir la cartelera pública
    await eventsCatalogPage.goto();

    // Act: escribir palabra clave en el buscador accesible
    await eventsCatalogPage.searchByKeyword('Vallenato');

    // Assert: comprobar que el campo conserva el filtro aplicado
    await expect(eventsCatalogPage.searchInput).toHaveValue('Vallenato');
  });
});