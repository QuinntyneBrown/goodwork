// Acceptance Test
// Traces to: L2-018, L2-019, L2-020
// Description: Below the opening section the page shows a products placeholder, the
// FaithTech Playbook 2.0 work process and the frequently asked questions.

import { expect, test } from '../fixtures/test';

test.describe('Products placeholder', () => {
  test('shows a Products region below the contact form', async ({ home }) => {
    await home.goto();

    await expect(home.products).toBeVisible();
    const contact = await home.contactSection.boundingBox();
    const products = await home.products.boundingBox();
    expect(products?.y).toBeGreaterThan((contact?.y ?? 0) + (contact?.height ?? 0));
  });

  test('holds one "Coming soon" card with no price or dead link', async ({ home }) => {
    await home.goto();

    await expect(home.productCards).toHaveCount(1);
    await expect(home.productCards).toContainText('Coming soon');
    await expect(home.products).not.toContainText(/[$€£]\s?\d/);
    await expect(home.products.getByRole('link')).toHaveCount(0);
  });
});

const STEPS = [
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

test.describe('Work process', () => {
  test('lists the four steps in order, each with its number, name, summary and practices', async ({
    home,
  }) => {
    await home.goto();

    await expect(home.processSteps).toHaveCount(4);
    for (const [i, step] of STEPS.entries()) {
      const item = home.processSteps.nth(i);
      await expect(item.getByRole('heading', { level: 3 })).toHaveText(step.name);
      await expect(item).toContainText(`Step ${i + 1}`);
      await expect(item).toContainText(step.summary);
      await expect(item).toContainText(step.practices);
    }
  });

  test('says the cycle starts again and credits the FaithTech Playbook 2.0', async ({ home }) => {
    await home.goto();

    await expect(home.processCycle).toBeVisible();
    await expect(home.processCredit).toHaveAttribute('href', 'https://faithtech.com');
  });

  for (const { width, perRow } of [
    { width: 375, perRow: 1 },
    { width: 800, perRow: 2 },
    { width: 1280, perRow: 4 },
  ]) {
    test(`${width}px: shows ${perRow} step(s) per row`, async ({ home }) => {
      await home.page.setViewportSize({ width, height: 900 });
      await home.goto();

      const tops = await home.processSteps.evaluateAll((items) =>
        items.map((item) => item.getBoundingClientRect().top),
      );
      expect(tops.filter((top) => top === tops[0])).toHaveLength(perRow);
    });
  }
});

const QUESTIONS = [
  'Who do you work with?',
  'How can you cost less than an agency?',
  'How does pricing work?',
  'How long does a project take?',
  'Can we update the website ourselves?',
  'What happens after launch?',
];

test.describe('Frequently asked questions', () => {
  test('lists the six questions in order, each closed', async ({ home }) => {
    await home.goto();

    await expect(home.faqQuestions).toHaveText(QUESTIONS);
    for (const question of QUESTIONS) await expect(home.faqAnswer(question)).toBeHidden();
    await expect(home.faq).not.toContainText(/[$€£]\s?\d/);
  });

  test('opens and closes an answer by pointer', async ({ home }) => {
    await home.goto();

    await home.faqQuestion('How does pricing work?').click();
    await expect(home.faqAnswer('How does pricing work?')).toContainText('fixed-price quote');

    await home.faqQuestion('How does pricing work?').click();
    await expect(home.faqAnswer('How does pricing work?')).toBeHidden();
  });

  test('opens an answer with Enter and closes it with Space', async ({ home }) => {
    await home.goto();
    const question = 'Can we update the website ourselves?';

    await home.faqQuestion(question).focus();
    await home.page.keyboard.press('Enter');
    await expect(home.faqAnswer(question)).toBeVisible();

    await home.page.keyboard.press('Space');
    await expect(home.faqAnswer(question)).toBeHidden();
  });
});
