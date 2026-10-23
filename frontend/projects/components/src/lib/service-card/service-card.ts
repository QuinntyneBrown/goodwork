import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Card } from '../card/card';

export type ServiceIcon = 'app' | 'globe';

@Component({
  selector: 'gw-service-card',
  imports: [Card],
  templateUrl: './service-card.html',
  styleUrl: './service-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceCard {
  readonly heading = input.required<string>();
  readonly body = input.required<string>();
  readonly icon = input<ServiceIcon>('app');
}
