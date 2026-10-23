export type ContactRequestResult =
  | { readonly status: 'accepted' }
  /** The server refused the values; `fieldErrors` maps a field name to its message. */
  | { readonly status: 'invalid'; readonly fieldErrors: Readonly<Record<string, string>> }
  /** The request did not get through: server error, rate limit, network failure or timeout. */
  | { readonly status: 'failed' };
