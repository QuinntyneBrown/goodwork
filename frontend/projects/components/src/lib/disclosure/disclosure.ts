import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'gw-disclosure',
  templateUrl: './disclosure.html',
  styleUrl: './disclosure.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Disclosure {
  readonly summary = input.required<string>();
  readonly body = input.required<string>();
}
