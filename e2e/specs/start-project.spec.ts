// Acceptance Test
// Traces to: L2-002, L2-014
// Description: "Start a project" moves to the contact form and focuses the email field;
// the skip link is the first focus stop; reduced motion disables animated scrolling.

import { expect, test } from '../fixtures/test';

test.describe('Start a project', () => {
  test('scrolls to the contact form and focuses the email field', async ({ home }) => {
    await home.page.setViewportSize({ width: 375, height: 700 });
    await home.goto();

    await home.startProject.click();

    await expect(home.emailField).toBeFocused();
    await expect(home.emailField).toBeInViewport();
  });

  test('leaves the URL on the home route', async ({ home }) => {
    await home.goto();

    await home.startProject.click();

    expect(new URL(home.page.url()).pathname).toBe('/');
  });
});

test.describe('Skip link', () => {
  test('is the first focus stop and moves focus to the main content', async ({ home }) => {
    await home.goto();

    await home.page.keyboard.press('Tab');
    await expect(home.skipLink).toBeFocused();
    await expect(home.skipLink).toBeInViewport();

    await home.page.keyboard.press('Enter');
    await expect(home.main).toBeFocused();
  });
});

test.describe('Reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('uses instant scrolling', async ({ home }) => {
    await home.goto();

    const behavior = await home.page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );

    expect(behavior).toBe('auto');
  });
});
