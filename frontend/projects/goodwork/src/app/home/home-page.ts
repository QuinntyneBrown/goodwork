import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import {
  HeroNote,
  Hero,
  ProcessStep,
  ServiceCard,
  ServiceIcon,
  SiteFooter,
  SiteHeader,
  SkipLink,
  VideoPlayer,
} from 'components';
import { ContactForm } from 'domain';
import { STUDIO } from '../studio';

interface Step {
  readonly heading: string;
  readonly body: string;
}

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
    ProcessStep,
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

  protected readonly product: Service = {
    heading: 'Coming soon',
    icon: 'app',
    body: 'Ready-made tools for churches, ministries and non-profits are on the way. Tell us what you would use.',
  };

  protected readonly process: readonly Step[] = [
    {
      heading: 'Lament',
      body: 'We listen before we build, sitting with the people your work serves until we understand what is broken.',
    },
    {
      heading: 'Discern',
      body: 'We seek the wisest response, which is not always new software: reject, receive what exists, reimagine it, or create.',
    },
    {
      heading: 'Build',
      body: 'We build in short cycles of prayer, prototype and pause, ready to change course when the work drifts.',
    },
    {
      heading: 'Steward',
      body: 'We take responsibility for what we release: we tend it, examine its fruit and tell its story truthfully.',
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
