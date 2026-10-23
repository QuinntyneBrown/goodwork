import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { ContactRequestInput } from './contact-request-input';
import { ContactRequestResult } from './contact-request-result';
import { IContactRequestService } from './i-contact-request-service';

const REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class ContactRequestService implements IContactRequestService {
  private readonly http = inject(HttpClient);

  async submit(input: ContactRequestInput): Promise<ContactRequestResult> {
    try {
      await firstValueFrom(
        this.http.post('/api/contact-requests', input).pipe(timeout(REQUEST_TIMEOUT_MS)),
      );
      return { status: 'accepted' };
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 400) {
        return { status: 'invalid', fieldErrors: firstErrorPerField(error.error) };
      }
      return { status: 'failed' };
    }
  }
}

function firstErrorPerField(body: unknown): Record<string, string> {
  const errors = (body as { errors?: Record<string, string[]> } | null)?.errors ?? {};
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([, messages]) => messages.length > 0)
      .map(([field, messages]) => [field, messages[0]]),
  );
}
