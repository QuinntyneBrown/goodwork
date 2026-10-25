// Acceptance Test
// Traces to: L2-018, L2-019, L2-020
// Description: Below the contact form the home page introduces products, explains the
// FaithTech Playbook 2.0 work process and answers frequently asked questions.

import { expect, test } from '../fixtures/test';

test.describe('Products', () => {
  test('shows a Products section with one "Coming soon" card below the contact form', async ({
    home,
  }) => {
    await home.goto();

    await expect(home.products.getByRole('heading', { level: 2 })).toHaveText('Products');
    await expect(home.productCards).toHaveCount(1);
    await expect(home.productCards).toHaveText('Coming soon');
    expect(await home.isBelow(home.products, home.contactSection)).toBe(true);
  });
});

test.describe('Work process', () => {
  test('names the FaithTech Playbook 2.0 below the Products section', async ({ home }) => {
    await home.goto();

    await expect(home.process.getByRole('heading', { level: 2 })).toHaveText('How we work');
    await expect(home.process).toContainText('FaithTech Playbook 2.0');
    expect(await home.isBelow(home.process, home.products)).toBe(true);
  });

  test('lists Lament, Discern, Build and Steward in order, numbered and described', async ({
    home,
  }) => {
    await home.goto();

    await expect(home.process.getByRole('list')).toHaveJSProperty('tagName', 'OL');
    expect(await home.processStepTitles()).toEqual(['Lament', 'Discern', 'Build', 'Steward']);
    for (const [i, step] of (await home.processSteps.all()).entries()) {
      await expect(step).toContainText(`Step ${i + 1}`);
      await expect(step.getByRole('paragraph')).not.toBeEmpty();
    }
  });

  test('puts the four steps in one row from 1024px and stacks them under 768px', async ({
    home,
  }) => {
    await home.page.setViewportSize({ width: 1024, height: 800 });
    await home.goto();
    const wide = await Promise.all((await home.processSteps.all()).map((s) => s.boundingBox()));
    expect(new Set(wide.map((b) => b?.y)).size).toBe(1);

    await home.page.setViewportSize({ width: 375, height: 800 });
    const narrow = await Promise.all((await home.processSteps.all()).map((s) => s.boundingBox()));
    expect(new Set(narrow.map((b) => b?.x)).size).toBe(1);
  });
});
