import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A native details/summary: the browser supplies the button role, expanded state and keys. */
@Component({
  selector: 'gw-disclosure',
  templateUrl: './disclosure.html',
  styleUrl: './disclosure.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Disclosure {
  readonly heading = input.required<string>();
}
