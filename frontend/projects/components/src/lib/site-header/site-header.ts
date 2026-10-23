import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BrandLockup } from '../brand-lockup/brand-lockup';
import { Button } from '../button/button';

@Component({
  selector: 'gw-site-header',
  imports: [BrandLockup, Button],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly ctaLabel = input.required<string>();
  readonly ctaHref = input('#contact');
  readonly ctaActivated = output<void>();

  protected activate(event: Event): void {
    event.preventDefault();
    this.ctaActivated.emit();
  }
}
