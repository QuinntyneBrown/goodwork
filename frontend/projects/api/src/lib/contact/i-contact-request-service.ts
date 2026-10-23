import { ContactRequestInput } from './contact-request-input';
import { ContactRequestResult } from './contact-request-result';

export interface IContactRequestService {
  submit(input: ContactRequestInput): Promise<ContactRequestResult>;
}
