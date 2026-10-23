import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HeroNote } from './hero-note';

@Component({
  selector: 'gw-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
  readonly notes = input<readonly HeroNote[]>([]);
}
