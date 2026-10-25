// Acceptance Test
// Traces to: L2-014, L2-013
// Description: Every state of the page passes axe (WCAG 2.2 AA) in both colour schemes, is fully
// operable by keyboard with visible focus, announces its messages, and has a sound heading outline.

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import type { HomePage } from '../page-objects/home-page';
import type { FakeApi } from '../fixtures/fake-api';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
}

const STATES: {
  name: string;
  arrange: (home: HomePage, api: FakeApi) => Promise<void>;
}[] = [
  { name: 'default', arrange: async () => undefined },
  {
    name: 'invalid',
    arrange: async (home) => {
      await home.fill('ruth@', '');
      await home.submit();
      await expect(home.errorSummary).toBeVisible();
    },
  },
  {
    name: 'sending',
    arrange: async (home, api) => {
      api.behavior = { kind: 'never-responds' };
      await home.fillValid();
      await home.submit();
      await expect(home.sendingButton).toBeVisible();
    },
  },
  {
    name: 'sent',
    arrange: async (home) => {
      await home.fillValid();
      await home.submit();
      await expect(home.confirmation).toBeVisible();
    },
  },
  {
    name: 'error',
    arrange: async (home, api) => {
      api.behavior = { kind: 'server-error' };
      await home.fillValid();
      await home.submit();
      await expect(home.failureAlert).toBeVisible();
    },
  },
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe in the ${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });

    for (const state of STATES) {
      test(`${state.name} state has no violations`, async ({ home, api }) => {
        await home.goto();
        await state.arrange(home, api);

        await expectNoViolations(home.page);
      });
    }
  });
}

test.describe('Keyboard and structure', () => {
  test('tab order follows the visual order and every stop shows a focus indicator', async ({
    home,
  }) => {
    await home.goto();
    // The native video player keeps focus on the <video> while Tab walks its own
    // controls, so repeated stops on the same element count once.
    const stops: string[] = [];
    for (let i = 0; i < 20 && !stops.at(-1)?.startsWith('hello@'); i++) {
      await home.page.keyboard.press('Tab');
      const stop = await home.page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const w = window as unknown as { lastStop?: Element };
        if (w.lastStop === el) return null;
        w.lastStop = el;
        const outline = getComputedStyle(el).outlineStyle;
        return `${el.getAttribute('aria-label') ?? el.innerText ?? el.id}|${outline}`;
      });
      if (stop !== null) stops.push(stop);
    }

    expect(stops.map((s) => s.split('|')[0]?.trim())).toEqual([
      'Skip to content',
      'Goodwork, home',
      'Start a project',
      'Goodwork pitch',
      '',
      '',
      'Send request',
      'How much will our project cost?',
      'How long does a project take?',
      'Do you only work with churches and ministries?',
      'Can we update our website ourselves?',
      'What happens after launch?',
      'How do we get started?',
      'hello@goodwork.rocks',
    ]);
    for (const stop of stops) expect(stop.split('|')[1]).not.toBe('none');
  });

  test('has exactly one h1 and no skipped heading levels', async ({ home }) => {
    await home.goto();

    const levels = await home.page.evaluate(() =>
      [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1])),
    );

    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    });
  });

  test('messages are announced: the summary and failure alert are alerts, the confirmation a status', async ({
    home,
    api,
  }) => {
    await home.goto();
    await home.submit();
    await expect(home.page.getByRole('alert')).toContainText('to fix before we can send this');

    api.behavior = { kind: 'server-error' };
    await home.fillValid();
    await home.submit();
    await expect(home.page.getByRole('alert')).toContainText("We couldn't send your request");

    api.behavior = { kind: 'accept' };
    await home.tryAgainButton.click();
    await expect(home.page.getByRole('status').filter({ hasText: 'Request sent.' })).toBeVisible();
  });
});
