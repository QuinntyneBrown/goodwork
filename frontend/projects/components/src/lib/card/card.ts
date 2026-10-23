import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: '[gwCard]',
  templateUrl: './card.html',
  styleUrl: './card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {}
