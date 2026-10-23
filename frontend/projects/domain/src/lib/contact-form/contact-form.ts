import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CONTACT_REQUEST_SERVICE } from 'api';
import { Alert, Button, Card, TextField } from 'components';
import { FieldError, FieldName, validateEmail, validateMessage } from './contact-validation';

type Phase = 'editing' | 'sending' | 'sent' | 'failed';

/** The sending state only appears when a request is still in flight after this long. */
const BUSY_DELAY_MS = 300;

const NUMBER_WORDS = ['No', 'One', 'Two'];

@Component({
  selector: 'gw-contact-form',
  imports: [Alert, Button, Card, TextField],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactForm {
  readonly studioEmail = input.required<string>();

  private readonly service = inject(CONTACT_REQUEST_SERVICE);
  private readonly injector = inject(Injector);

  private readonly emailField = viewChild<TextField>('emailField');
  private readonly messageField = viewChild<TextField>('messageField');
  private readonly summary = viewChild<Alert>('summary');
  private readonly failure = viewChild<Alert>('failure');
  private readonly confirmation = viewChild<Alert>('confirmation');

  protected readonly email = signal('');
  protected readonly message = signal('');
  protected readonly website = signal('');
  protected readonly phase = signal<Phase>('editing');
  protected readonly busy = signal(false);
  protected readonly sentTo = signal('');
  protected readonly errors = signal<Partial<Record<FieldName, FieldError>>>({});

  protected readonly errorList = computed(() =>
    (['email', 'message'] as const).flatMap((field) => {
      const error = this.errors()[field];
      return error ? [{ field, summary: error.summary }] : [];
    }),
  );
  protected readonly summaryHeading = computed(
    () =>
      `${NUMBER_WORDS[this.errorList().length]} thing${this.errorList().length === 1 ? '' : 's'} to fix before we can send this`,
  );
  protected readonly sending = computed(() => this.phase() === 'sending');
  protected readonly buttonLabel = computed(() => {
    if (this.busy()) return 'Sending…';
    return this.phase() === 'failed' ? 'Try again' : 'Send request';
  });
  protected readonly hint = computed(() => (this.busy() ? 'Sending your request' : ''));

  /** Moves focus to the email field, or to the confirmation once the form has been replaced by it. */
  focusEmail(options?: FocusOptions): void {
    if (this.phase() === 'sent') {
      this.confirmation()?.focus(options);
    } else {
      this.emailField()?.focus(options);
    }
  }

  protected setEmail(value: string): void {
    this.email.set(value);
    this.revalidate('email');
  }

  protected setMessage(value: string): void {
    this.message.set(value);
    this.revalidate('message');
  }

  protected focusField(field: FieldName, event: Event): void {
    event.preventDefault();
    (field === 'email' ? this.emailField() : this.messageField())?.focus();
  }

  protected sendAnother(): void {
    this.email.set('');
    this.message.set('');
    this.website.set('');
    this.errors.set({});
    this.phase.set('editing');
    this.focusAfterRender(() => this.emailField()?.focus());
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;

    const errors = this.validateAll();
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.focusAfterRender(() => this.summary()?.focus());
      return;
    }

    this.phase.set('sending');
    const timer = setTimeout(() => this.busy.set(true), BUSY_DELAY_MS);
    const email = this.email().trim();
    const result = await this.service
      .submit({ email, message: this.message().trim(), website: this.website() })
      .finally(() => {
        clearTimeout(timer);
        this.busy.set(false);
      });

    if (result.status === 'accepted') {
      this.sentTo.set(email);
      this.phase.set('sent');
      this.focusAfterRender(() => this.confirmation()?.focus());
      return;
    }

    if (result.status === 'invalid') {
      const serverErrors = this.fromServer(result.fieldErrors);
      if (Object.keys(serverErrors).length > 0) {
        this.errors.set(serverErrors);
        this.phase.set('editing');
        this.focusAfterRender(() => this.summary()?.focus());
        return;
      }
    }

    this.phase.set('failed');
    this.focusAfterRender(() => this.failure()?.focus());
  }

  private validateAll(): Partial<Record<FieldName, FieldError>> {
    const email = validateEmail(this.email());
    const message = validateMessage(this.message());
    return { ...(email && { email }), ...(message && { message }) };
  }

  /** Once a field has shown an error, re-check it as the visitor types so the error clears when fixed. */
  private revalidate(field: FieldName): void {
    if (!this.errors()[field]) return;
    const error = field === 'email' ? validateEmail(this.email()) : validateMessage(this.message());
    this.errors.update(({ [field]: _removed, ...others }) =>
      error ? { ...others, [field]: error } : others,
    );
  }

  private fromServer(
    fieldErrors: Readonly<Record<string, string>>,
  ): Partial<Record<FieldName, FieldError>> {
    const result: Partial<Record<FieldName, FieldError>> = {};
    for (const field of ['email', 'message'] as const) {
      const text = fieldErrors[field];
      if (text) result[field] = { summary: text, detail: text };
    }
    return result;
  }

  private focusAfterRender(action: () => void): void {
    afterNextRender(action, { injector: this.injector });
  }
}
