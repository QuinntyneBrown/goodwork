import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'gw-site-footer',
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  readonly year = input.required<number>();
  readonly name = input('Goodwork');
  readonly location = input.required<string>();
  readonly email = input.required<string>();
}
