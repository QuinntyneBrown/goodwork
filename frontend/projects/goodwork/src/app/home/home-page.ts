import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import {
  HeroNote,
  Hero,
  ProductCard,
  ServiceCard,
  ServiceIcon,
  SiteFooter,
  SiteHeader,
  SkipLink,
  VideoPlayer,
} from 'components';
import { ContactForm } from 'domain';
import { STUDIO } from '../studio';

interface Service {
  readonly heading: string;
  readonly body: string;
  readonly icon: ServiceIcon;
}

@Component({
  selector: 'gw-home-page',
  imports: [
    ContactForm,
    Hero,
    ProductCard,
    ServiceCard,
    SiteFooter,
    SiteHeader,
    SkipLink,
    VideoPlayer,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly studio = STUDIO;
  protected readonly year = new Date().getFullYear();

  protected readonly lead =
    'Websites and custom apps for non-profits, churches and mission-driven companies. Agency quality, without the agency price.';

  protected readonly notes: readonly HeroNote[] = [
    {
      lead: 'Why it costs less:',
      text: 'a small senior team, an AI-assisted process and a fixed-price quote up front.',
    },
    {
      text: 'A Christian-owned studio, serving anyone whose work serves others.',
    },
  ];

  protected readonly services: readonly Service[] = [
    {
      heading: 'Web and mobile apps',
      icon: 'app',
      body: 'Scheduling, case management, donor records and registration, built for the phone.',
    },
    {
      heading: 'Websites',
      icon: 'globe',
      body: 'Fast, accessible sites you can edit yourself.',
    },
  ];

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly contact = viewChild.required(ContactForm);
  private readonly contactElement = viewChild.required(ContactForm, { read: ElementRef });

  protected skipToContent(): void {
    this.main().nativeElement.focus();
  }

  protected startProject(): void {
    // scrollIntoView follows the page's scroll-behavior, which is instant under reduced motion.
    this.contactElement().nativeElement.scrollIntoView();
    this.contact().focusEmail({ preventScroll: true });
  }
}
