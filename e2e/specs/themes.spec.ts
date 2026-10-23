// Acceptance Test
// Traces to: L2-013
// Description: The page follows the operating system's colour scheme with no flash,
// using the light palette by default and the reversed brand palette in dark mode.

import { expect, test } from '../fixtures/test';

function luminance(rgb: string): number {
  const [r = 0, g = 0, b = 0] = (rgb.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

async function backgroundAtDomContentLoaded(
  page: import('@playwright/test').Page,
): Promise<string> {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __bg: string }).__bg = getComputedStyle(
        document.body,
      ).backgroundColor;
    });
  });
  await page.goto('/');
  return page.evaluate(() => (window as unknown as { __bg: string }).__bg);
}

test.describe('Dark scheme', () => {
  test.use({ colorScheme: 'dark' });

  test('renders the dark palette, already at DOMContentLoaded (no flash)', async ({ home }) => {
    const before = await backgroundAtDomContentLoaded(home.page);

    expect(luminance(before)).toBeLessThan(0.2);
    const after = await home.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(after).toBe(before);
  });
});

test.describe('Light scheme', () => {
  test.use({ colorScheme: 'light' });

  test('renders the light palette', async ({ home }) => {
    const background = await backgroundAtDomContentLoaded(home.page);

    expect(luminance(background)).toBeGreaterThan(0.8);
  });
});

test.describe('No preference', () => {
  test.use({ colorScheme: 'no-preference' });

  test('renders the light palette', async ({ home }) => {
    await home.goto();

    const background = await home.page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    expect(luminance(background)).toBeGreaterThan(0.8);
  });
});
