import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'gw-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'role()',
    '[attr.data-variant]': 'variant()',
    '[class.with-rule]': 'rule()',
    tabindex: '-1',
  },
})
export class Alert {
  readonly variant = input<AlertVariant>('info');
  readonly role = input<'alert' | 'status'>('status');
  readonly heading = input.required<string>();
  /** Adds the heavier left rule used by form error summaries. */
  readonly rule = input(false);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  focus(options?: FocusOptions): void {
    this.element.nativeElement.focus(options);
  }
}
