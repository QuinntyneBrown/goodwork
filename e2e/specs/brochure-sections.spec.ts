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
