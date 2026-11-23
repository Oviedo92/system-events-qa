import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPromoterPage } from '../pages/RegisterPromoterPage';
import { PromoterKycPage } from '../pages/PromoterKycPage';
import { ModeratorDashboardPage } from '../pages/ModeratorDashboardPage';
import { EventsCatalogPage } from '../pages/EventsCatalogPage';

type EventiaFixtures = {
  loginPage: LoginPage;
  registerPromoterPage: RegisterPromoterPage;
  promoterKycPage: PromoterKycPage;
  moderatorDashboardPage: ModeratorDashboardPage;
  eventsCatalogPage: EventsCatalogPage;
};

export const test = base.extend<EventiaFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPromoterPage: async ({ page }, use) => {
    await use(new RegisterPromoterPage(page));
  },
  promoterKycPage: async ({ page }, use) => {
    await use(new PromoterKycPage(page));
  },
  moderatorDashboardPage: async ({ page }, use) => {
    await use(new ModeratorDashboardPage(page));
  },
  eventsCatalogPage: async ({ page }, use) => {
    await use(new EventsCatalogPage(page));
  },
});

export { expect } from '@playwright/test';