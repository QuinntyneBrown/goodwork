import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Badge } from '../badge/badge';
import { Card } from '../card/card';

@Component({
  selector: 'gw-product-card',
  imports: [Badge, Card],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly status = input<string | null>(null);
  readonly heading = input.required<string>();
  readonly body = input.required<string>();
}
