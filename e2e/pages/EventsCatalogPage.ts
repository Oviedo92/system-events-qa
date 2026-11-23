import { type Locator, type Page } from '@playwright/test';

export class EventsCatalogPage {
  readonly page: Page;
  readonly catalogSection: Locator;
  readonly searchInput: Locator;
  readonly citySelect: Locator;
  readonly resetFiltersButton: Locator;
  readonly eventCards: Locator;
  readonly mapSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.catalogSection = page.locator('.events-page');
    // Usa el label accesible de EventsPage ("Buscar eventos")
    this.searchInput = page.getByLabel(/buscar eventos/i);
    this.citySelect = page.getByLabel(/ciudad/i);
    this.resetFiltersButton = page.getByRole('button', { name: /limpiar filtros/i });
    this.eventCards = page.locator('.event-card');
    this.mapSection = page.getByTestId('event-detail-map-section');
  }

  async goto() {
    await this.page.goto('/events');
  }

  async searchByKeyword(keyword: string) {
    await this.searchInput.fill(keyword);
  }

  async clearFilters() {
    await this.resetFiltersButton.click();
  }

  async openEventByName(eventName: string) {
    const targetCard = this.eventCards.filter({ hasText: eventName });
    await targetCard.getByRole('button').click();
  }
}