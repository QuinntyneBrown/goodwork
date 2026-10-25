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
  readonly step = input.required<number>();
  readonly heading = input.required<string>();
  readonly body = input.required<string>();
}
