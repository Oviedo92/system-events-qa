import { type Locator, type Page } from '@playwright/test';

// Buffer PDF mínimo válido para evitar dependencias de archivos externos
const SAMPLE_PDF_FILE = {
  name: 'sample-kyc.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF'),
};

export class PromoterKycPage {
  readonly page: Page;
  readonly naturalButton: Locator;
  readonly juridicalButton: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly docTypeSelect: Locator;
  readonly docNumberInput: Locator;
  readonly issueDateInput: Locator;
  readonly birthDateInput: Locator;
  readonly businessNameInput: Locator;
  readonly razonSocialInput: Locator;
  readonly nitInput: Locator;
  readonly nitDvInput: Locator;
  readonly repFirstNameInput: Locator;
  readonly repLastNameInput: Locator;
  readonly repDocNumberInput: Locator;
  readonly repIssueDateInput: Locator;
  readonly departmentSelect: Locator;
  readonly citySelect: Locator;
  readonly addressInput: Locator;
  readonly identityPdfInput: Locator;
  readonly rutPdfInput: Locator;
  readonly chamberPdfInput: Locator;
  readonly phoneInput: Locator;
  readonly descriptionInput: Locator;
  readonly signatureCanvas: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.naturalButton = page.getByTestId('btn-kyc-natural');
    this.juridicalButton = page.getByTestId('btn-kyc-juridical');
    this.firstNameInput = page.getByTestId('input-kyc-firstname');
    this.lastNameInput = page.getByTestId('input-kyc-lastname');
    this.docTypeSelect = page.getByTestId('select-kyc-doctype');
    this.docNumberInput = page.getByTestId('input-kyc-docnumber');
    this.issueDateInput = page.getByTestId('input-kyc-issuedate');
    this.birthDateInput = page.getByTestId('input-kyc-birthdate');
    this.businessNameInput = page.getByTestId('input-kyc-businessname');
    this.razonSocialInput = page.getByTestId('input-kyc-razonsocial');
    this.nitInput = page.getByTestId('input-kyc-nit');
    this.nitDvInput = page.getByTestId('input-kyc-nit-dv');
    this.repFirstNameInput = page.getByTestId('input-replegal-firstname');
    this.repLastNameInput = page.getByTestId('input-replegal-lastname');
    this.repDocNumberInput = page.getByTestId('input-replegal-docnumber');
    this.repIssueDateInput = page.getByTestId('input-replegal-issuedate');
    this.departmentSelect = page.getByTestId('select-kyc-department');
    this.citySelect = page.getByTestId('select-kyc-city');
    this.addressInput = page.getByTestId('input-kyc-address');
    this.identityPdfInput = page.getByTestId('file-kyc-identity-pdf');
    this.rutPdfInput = page.getByTestId('file-kyc-rut-pdf');
    this.chamberPdfInput = page.getByTestId('file-kyc-chamber-pdf');
    this.phoneInput = page.getByTestId('input-kyc-phone');
    this.descriptionInput = page.getByTestId('input-kyc-description');
    this.signatureCanvas = page.getByTestId('canvas-signature');
    this.submitButton = page.getByTestId('btn-submit-kyc');
    this.errorMessage = page.getByTestId('kyc-error-message');
    this.successMessage = page.getByTestId('kyc-success-message');
  }

  async goto() {
    await this.page.goto('/promoter/application');
  }

  async drawSignature() {
    // Desplaza el canvas a la vista antes de calcular coordenadas del mouse
    await this.signatureCanvas.scrollIntoViewIfNeeded();
    const box = await this.signatureCanvas.boundingBox();
    if (!box) return;
    await this.page.mouse.move(box.x + 30, box.y + 45);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + 150, box.y + 70, { steps: 5 });
    await this.page.mouse.move(box.x + 240, box.y + 40, { steps: 5 });
    await this.page.mouse.up();
  }

  async fillNitAndCheckAutoDv(nit: string) {
    await this.juridicalButton.click();
    await this.nitInput.fill(nit);
  }

  async submitNaturalKyc(params: {
    firstName: string;
    lastName: string;
    docNumber: string;
    birthDate: string;
    businessName: string;
  }) {
    await this.naturalButton.click();
    await this.firstNameInput.fill(params.firstName);
    await this.lastNameInput.fill(params.lastName);
    await this.docNumberInput.fill(params.docNumber);
    await this.issueDateInput.fill('2018-05-10');
    await this.birthDateInput.fill(params.birthDate);
    await this.businessNameInput.fill(params.businessName);
    await this.addressInput.fill('Cra 15 # 12-30');
    await this.identityPdfInput.setInputFiles(SAMPLE_PDF_FILE);
    await this.rutPdfInput.setInputFiles(SAMPLE_PDF_FILE);
    await this.phoneInput.fill('+57 300 555 0101');
    await this.descriptionInput.fill(
      'Organización profesional de eventos culturales y musicales.',
    );
    await this.drawSignature();
    await this.submitButton.click();
  }
}