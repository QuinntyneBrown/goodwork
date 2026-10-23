export const EMAIL_MAX_LENGTH = 254;
export const MESSAGE_MAX_LENGTH = 2000;

export type FieldName = 'email' | 'message';

export interface FieldError {
  /** Short text for the error summary link. */
  readonly summary: string;
  /** Full text shown beside the field. */
  readonly detail: string;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateEmail(value: string): FieldError | null {
  const email = value.trim();
  if (email.length > EMAIL_MAX_LENGTH) {
    const text = `Email must be ${EMAIL_MAX_LENGTH} characters or fewer`;
    return { summary: text, detail: text };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return {
      summary: 'Enter a complete email address',
      detail: 'Enter a complete email address like name@organization.org',
    };
  }
  return null;
}

export function validateMessage(value: string): FieldError | null {
  const message = value.trim();
  if (message.length === 0) {
    return {
      summary: 'Tell us a little about your project',
      detail: 'Tell us a little about your project so we know who to put on the call',
    };
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    const text = `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer`;
    return { summary: text, detail: text };
  }
  return null;
}
