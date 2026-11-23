import { type Locator, type Page } from '@playwright/test';

export class ModeratorDashboardPage {
  readonly page: Page;
  readonly dashboardSection: Locator;
  readonly applicationCard: Locator;
  readonly documentViewer: Locator;
  readonly reasonInput: Locator;
  readonly approveAppButton: Locator;
  readonly rejectAppButton: Locator;
  readonly feedbackBanner: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboardSection = page.getByTestId('moderator-dashboard');
    this.applicationCard = page.getByTestId('assigned-promoter-application-card');
    this.documentViewer = page.getByTestId('kyc-document-viewer');
    this.reasonInput = page.getByTestId('input-moderation-reason');
    this.approveAppButton = page.getByTestId('btn-approve-application');
    this.rejectAppButton = page.getByTestId('btn-reject-application');
    this.feedbackBanner = page.getByTestId('moderator-feedback');
    this.emptyState = page.getByTestId('moderator-empty-assignment');
  }

  async goto() {
    await this.page.goto('/moderator/dashboard');
  }

  async approveAssignedPromoter() {
    await this.approveAppButton.click();
  }
}