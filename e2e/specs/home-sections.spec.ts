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
