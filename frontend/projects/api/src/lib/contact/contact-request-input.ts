export interface ContactRequestInput {
  readonly email: string;
  readonly message: string;
  /** Honeypot field: hidden from people, so only bots fill it. */
  readonly website: string;
}
