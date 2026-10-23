import { Locator, Page, expect } from '@playwright/test';

export class HomePage {
  readonly skipLink: Locator;
  readonly brand: Locator;
  readonly startProject: Locator;
  readonly main: Locator;
  readonly heading: Locator;
  readonly eyebrow: Locator;
  readonly serviceCards: Locator;
  readonly footerEmail: Locator;
  readonly emailField: Locator;
  readonly messageField: Locator;
  readonly honeypot: Locator;
  readonly sendButton: Locator;
  readonly tryAgainButton: Locator;
  readonly sendingButton: Locator;
  readonly errorSummary: Locator;
  readonly failureAlert: Locator;
  readonly confirmation: Locator;
  readonly sendAnother: Locator;
  readonly replyHint: Locator;
  readonly pitchVideo: Locator;
  readonly pitchCaptions: Locator;
  readonly contactIntro: Locator;
  readonly messageHelp: Locator;

  constructor(readonly page: Page) {
    this.skipLink = page.getByRole('link', { name: 'Skip to content' });
    this.brand = page.getByRole('link', { name: 'Goodwork, home' });
    this.startProject = page.getByRole('link', { name: 'Start a project' });
    this.main = page.getByRole('main');
    this.heading = page.getByRole('heading', { level: 1 });
    this.eyebrow = page.getByText('Software for people doing good work');
    this.serviceCards = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { level: 3 }) });
    this.footerEmail = page.getByRole('contentinfo').getByRole('link');
    this.pitchVideo = page.locator('video[aria-label="Goodwork pitch"]');
    this.pitchCaptions = this.pitchVideo.locator('track[kind="captions"]');
    this.emailField = page.getByLabel('Email');
    this.messageField = page.getByLabel('What are you working on?');
    this.honeypot = page.locator('input[name="website"]');
    this.sendButton = page.getByRole('button', { name: 'Send request' });
    this.tryAgainButton = page.getByRole('button', { name: 'Try again' });
    this.sendingButton = page.getByRole('button', { name: 'Sending…' });
    this.errorSummary = page
      .getByRole('alert')
      .filter({ hasText: 'to fix before we can send this' });
    this.failureAlert = page
      .getByRole('alert')
      .filter({ hasText: "We couldn't send your request" });
    this.confirmation = page.getByRole('status').filter({ hasText: 'Request sent.' });
    this.sendAnother = page.getByRole('button', {
      name: 'Send another request',
    });
    this.replyHint = page.getByText('We reply within two business days.');
    this.contactIntro = page.getByText('No long forms.');
    this.messageHelp = page.getByText('Who you serve and what you need.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.heading).toBeVisible();
  }

  async fill(email: string, message: string): Promise<void> {
    await this.emailField.fill(email);
    await this.messageField.fill(message);
  }

  async fillValid(): Promise<void> {
    await this.fill(
      'ruth.okonkwo@hopehouse.org',
      'We run a transitional housing program and need a case management app.',
    );
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /Send request|Try again/ }).click();
  }

  /** The message shown beside a field (not the matching link in the error summary). */
  fieldError(text: string): Locator {
    return this.page.locator('[id$="-error"]').filter({ hasText: text });
  }

  async focusedElementId(): Promise<string> {
    return this.page.evaluate(() => document.activeElement?.id ?? '');
  }

  async focusedElementText(): Promise<string> {
    return this.page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.innerText ?? '',
    );
  }
}
