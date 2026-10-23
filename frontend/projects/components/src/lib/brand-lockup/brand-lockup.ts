import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'gw-brand-lockup',
  templateUrl: './brand-lockup.html',
  styleUrl: './brand-lockup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLockup {
  readonly href = input('/');
  readonly name = input('Goodwork');
}
