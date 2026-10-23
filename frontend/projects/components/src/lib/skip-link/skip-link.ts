import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'gw-skip-link',
  templateUrl: './skip-link.html',
  styleUrl: './skip-link.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLink {
  readonly href = input('#main');
  readonly label = input('Skip to content');
  readonly activated = output<void>();

  protected activate(event: Event): void {
    event.preventDefault();
    this.activated.emit();
  }
}
