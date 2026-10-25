import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import {
  Disclosure,
  HeroNote,
  Hero,
  ProcessStep,
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

interface Step {
  readonly name: string;
  readonly summary: string;
  readonly practices: string;
}

interface Question {
  readonly question: string;
  readonly answer: string;
}

@Component({
  selector: 'gw-home-page',
  imports: [
    ContactForm,
    Disclosure,
    Hero,
    ProcessStep,
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

  protected readonly steps: readonly Step[] = [
    {
      name: 'Lament',
      summary: 'We listen to the people affected before we reach for a solution.',
      practices: 'Listen, remember, repent, rejoice',
    },
    {
      name: 'Discern',
      summary: 'We seek wisdom before choosing a response.',
      practices: 'Reject, receive, reimagine or create',
    },
    {
      name: 'Build',
      summary: 'We build in dependence on the Spirit, and keep listening.',
      practices: 'Pray, prototype, pause',
    },
    {
      name: 'Steward',
      summary: 'We take responsibility for what we release.',
      practices: 'Tend, examine, testify',
    },
  ];

  protected readonly questions: readonly Question[] = [
    {
      question: 'Who do you work with?',
      answer:
        "Non-profits, churches and ministries, and companies whose work makes life better for someone. You don't need to share our faith to work with us.",
    },
    {
      question: 'How can you cost less than an agency?',
      answer:
        'We are a small senior team with no account managers or layers of hand-offs, and an AI-assisted, spec-driven process does the repetitive work. You pay for the thinking, not the overhead.',
    },
    {
      question: 'How does pricing work?',
      answer:
        'After a first conversation, which costs nothing, we send a fixed-price quote for the agreed scope. The price only changes if you ask for more.',
    },
    {
      question: 'How long does a project take?',
      answer:
        'It depends on scope. Your quote includes a timeline, and you see working software early and often rather than at the end.',
    },
    {
      question: 'Can we update the website ourselves?',
      answer: 'Yes. We build websites you can edit yourself, and we show your team how.',
    },
    {
      question: 'What happens after launch?',
      answer:
        'We stay with you. We fix what breaks, look honestly at how the product is serving people, and help it grow.',
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
