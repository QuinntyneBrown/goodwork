import { BrowserContext, Route } from '@playwright/test';

export type SubmitBehavior =
  | { kind: 'accept'; delayMs?: number }
  | { kind: 'server-error' }
  | { kind: 'rate-limited' }
  | { kind: 'network-failure' }
  | { kind: 'never-responds' }
  | { kind: 'invalid'; errors: Record<string, string[]> };

export interface Submission {
  readonly email: string;
  readonly message: string;
  readonly website: string;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * An in-memory stand-in for the Goodwork API. It answers the contracts the real API exposes
 * (POST /api/contact-requests: 202, 400 with field errors, 429, 5xx) and records what it received.
 * Any request it does not recognise is recorded in `unrouted` and aborted; the fixture fails the test.
 */
export class FakeApi {
  readonly submissions: Submission[] = [];
  readonly unrouted: string[] = [];
  behavior: SubmitBehavior = { kind: 'accept' };

  async install(context: BrowserContext, appOrigin: string): Promise<void> {
    await context.route('**/*', (route) => this.handle(route, appOrigin));
  }

  private async handle(route: Route, appOrigin: string): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());

    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.fallback();

    if (url.origin !== appOrigin) {
      this.unrouted.push(`${request.method()} ${request.url()}`);
      return route.abort();
    }

    if (!url.pathname.startsWith('/api/')) return route.fallback();

    if (request.method() === 'POST' && url.pathname === '/api/contact-requests') {
      return this.submit(route, request.postDataJSON() as Partial<Submission>);
    }

    this.unrouted.push(`${request.method()} ${url.pathname}`);
    return route.abort();
  }

  private async submit(route: Route, body: Partial<Submission>): Promise<void> {
    const behavior = this.behavior;
    switch (behavior.kind) {
      case 'server-error':
        return route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          body: '{"status":503}',
        });
      case 'rate-limited':
        return route.fulfill({
          status: 429,
          headers: { 'Retry-After': '600' },
        });
      case 'network-failure':
        return route.abort('connectionreset');
      case 'never-responds':
        return new Promise<void>(() => undefined);
      case 'invalid':
        return route.fulfill({
          status: 400,
          contentType: 'application/problem+json',
          body: JSON.stringify({ status: 400, errors: behavior.errors }),
        });
      case 'accept': {
        if (behavior.delayMs) await new Promise((resolve) => setTimeout(resolve, behavior.delayMs));
        const errors = validate(body);
        if (Object.keys(errors).length > 0) {
          return route.fulfill({
            status: 400,
            contentType: 'application/problem+json',
            body: JSON.stringify({ status: 400, errors }),
          });
        }
        const submission = {
          email: (body.email ?? '').trim(),
          message: (body.message ?? '').trim(),
          website: body.website ?? '',
        };
        // Like the real API, a filled honeypot gets 202 and nothing is kept.
        if (submission.website.trim() === '') this.submissions.push(submission);
        return route.fulfill({ status: 202 });
      }
    }
  }
}

function validate(body: Partial<Submission>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const email = (body.email ?? '').trim();
  const message = (body.message ?? '').trim();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors['email'] = ['Enter a complete email address like name@organization.org'];
  }
  if (message.length === 0 || message.length > 2000) {
    errors['message'] = ['Tell us a little about your project so we know who to put on the call'];
  }
  return errors;
}
