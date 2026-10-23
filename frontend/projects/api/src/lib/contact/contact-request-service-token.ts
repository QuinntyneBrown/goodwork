import { InjectionToken } from '@angular/core';
import { IContactRequestService } from './i-contact-request-service';

export const CONTACT_REQUEST_SERVICE = new InjectionToken<IContactRequestService>(
  'CONTACT_REQUEST_SERVICE',
);
