import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Card } from '../card/card';

@Component({
  selector: 'gw-process-step',
  imports: [Card],
  templateUrl: './process-step.html',
  styleUrl: './process-step.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessStep {
  readonly number = input.required<number>();
  readonly name = input.required<string>();
  readonly summary = input.required<string>();
  readonly practices = input.required<string>();
}
