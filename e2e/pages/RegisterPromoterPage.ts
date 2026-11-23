import { type Locator, type Page } from '@playwright/test';

export interface PromoterExpressData {
  brandName: string;
  personType: 'NATURAL' | 'JURIDICAL';
  phone: string;
  documentNumber: string;
  email: string;
  password: string;
  acceptTerms?: boolean;
}

export class RegisterPromoterPage {
  readonly page: Page;
  readonly userTab: Locator;
  readonly promoterTab: Locator;
  readonly buyerNameInput: Locator;
  readonly brandInput: Locator;
  readonly personTypeSelect: Locator;
  readonly phoneInput: Locator;
  readonly docExpressInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userTab = page.getByTestId('tab-register-user');
    this.promoterTab = page.getByTestId('tab-register-promoter');
    this.buyerNameInput = page.getByTestId('input-register-name');
    this.brandInput = page.getByTestId('input-promoter-brand');
    this.personTypeSelect = page.getByTestId('select-promoter-person-type');
    this.phoneInput = page.getByTestId('input-promoter-phone');
    this.docExpressInput = page.getByTestId('input-promoter-doc-express');
    this.emailInput = page.getByTestId('input-register-email');
    this.passwordInput = page.getByTestId('input-register-password');
    this.termsCheckbox = page.getByTestId('checkbox-promoter-terms');
    this.submitButton = page.getByTestId('btn-submit-register');
    this.errorMessage = page.getByTestId('register-error-message');
  }

  async goto() {
    await this.page.goto('/register');
  }

  async registerBuyer(name: string, email: string, password: string) {
    await this.userTab.click();
    await this.buyerNameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async registerPromoterPhase1(data: PromoterExpressData) {
    await this.promoterTab.click();
    await this.brandInput.fill(data.brandName);
    await this.personTypeSelect.selectOption(data.personType);
    await this.phoneInput.fill(data.phone);
    await this.docExpressInput.fill(data.documentNumber);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    if (data.acceptTerms !== false) {
      await this.termsCheckbox.check();
    }
    await this.submitButton.click();
  }
}