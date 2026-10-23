import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import {
  HeroNote,
  Hero,
  ServiceCard,
  ServiceIcon,
  SiteFooter,
  SiteHeader,
  SkipLink,
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
  imports: [ContactForm, Hero, ServiceCard, SiteFooter, SiteHeader, SkipLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly studio = STUDIO;
  protected readonly year = new Date().getFullYear();

  protected readonly lead =
    'Goodwork is a small software studio that builds websites and custom applications for non-profits, churches and ministries, and companies whose work makes life better for someone. We bring the same quality a large agency would, without the agency price.';

  protected readonly notes: readonly HeroNote[] = [
    {
      lead: 'Why it costs less:',
      text: "we're a small, senior team with low overhead and a modern, AI-assisted process that turns a clear spec into working software in a fraction of the usual hours. You get a fixed-price quote before any work starts.",
    },
    {
      text: "We build because we believe good work is worth doing well. We're a Christian-owned studio, glad to serve anyone whose work serves others.",
    },
  ];

  protected readonly services: readonly Service[] = [
    {
      heading: 'Web and mobile apps',
      icon: 'app',
      body: "Custom applications for the things spreadsheets can't do anymore: volunteer scheduling, case management, donor and member records, event registration. Built to be used on a phone in the field.",
    },
    {
      heading: 'Websites',
      icon: 'globe',
      body: 'Fast, accessible sites that tell your story plainly and make giving, signing up and getting in touch easy. You can edit the content yourself afterwards.',
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
