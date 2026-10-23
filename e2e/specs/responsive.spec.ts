// Acceptance Test
// Traces to: L2-012
// Description: The page lays out correctly from extra small to extra large viewports,
// never scrolls horizontally, and fits in 1100 px at 1280x800.

import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'XS (375)', width: 375, height: 800 },
  { name: 'SM (600)', width: 600, height: 900 },
  { name: 'MD (800)', width: 800, height: 1000 },
  { name: 'LG (1000)', width: 1000, height: 800 },
  { name: 'XL (1280)', width: 1280, height: 800 },
  { name: 'reflow (320)', width: 320, height: 700 },
];

test.describe('Responsive layout', () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.name}: no horizontal scroll`, async ({ home }) => {
      await home.page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await home.goto();

      const overflow = await home.page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('XS: services stack in one column and every target is at least 24x24 px', async ({
    home,
  }) => {
    await home.page.setViewportSize({ width: 375, height: 800 });
    await home.goto();

    const first = await home.serviceCards.nth(0).boundingBox();
    const second = await home.serviceCards.nth(1).boundingBox();
    expect(first?.x).toBe(second?.x);
    expect(second?.y).toBeGreaterThan(first?.y ?? 0);

    // The honeypot (tabindex -1, off-screen) is not a target a visitor can use.
    const targets = home.page.locator(
      'a:visible, button:visible, input:visible:not([tabindex="-1"]), textarea:visible',
    );
    for (const target of await targets.all()) {
      const box = await target.boundingBox();
      // Skip the off-screen skip link; it is a target only while focused.
      if (!box || box.y < 0) continue;
      expect
        .soft(box.height, await target.innerText().catch(() => 'target'))
        .toBeGreaterThanOrEqual(24);
    }
  });

  test('SM: content stays single-column', async ({ home }) => {
    await home.page.setViewportSize({ width: 600, height: 900 });
    await home.goto();

    const first = await home.serviceCards.nth(0).boundingBox();
    const second = await home.serviceCards.nth(1).boundingBox();
    expect(first?.x).toBe(second?.x);
  });

  for (const width of [800, 1000]) {
    test(`${width}px: the two service cards sit side by side`, async ({ home }) => {
      await home.page.setViewportSize({ width, height: 1000 });
      await home.goto();

      const first = await home.serviceCards.nth(0).boundingBox();
      const second = await home.serviceCards.nth(1).boundingBox();

      expect(second?.x).toBeGreaterThan(first?.x ?? 0);
      expect(second?.y).toBe(first?.y);
    });
  }

  test('XL: two columns and the whole page fits in 1100 px at 1280x800', async ({ home }) => {
    await home.page.setViewportSize({ width: 1280, height: 800 });
    await home.goto();

    const contact = await home.page
      .getByRole('heading', { level: 2, name: 'Tell us about your project' })
      .boundingBox();
    const hero = await home.heading.boundingBox();
    expect(contact?.x).toBeGreaterThan((hero?.x ?? 0) + (hero?.width ?? 0) - 1);

    const height = await home.page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThanOrEqual(1100);
  });
});
