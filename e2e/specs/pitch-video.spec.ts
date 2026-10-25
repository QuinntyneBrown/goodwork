// Acceptance Test
// Traces to: L2-017
// Description: A narrated pitch video sits beside the hero with the native player,
// a poster and captions, and never autoplays.

import { expect, test } from '../fixtures/test';

test.describe('Pitch video', () => {
  test('offers the native player, paused, with a poster and captions', async ({ home }) => {
    await home.goto();

    await expect(home.pitchVideo).toBeVisible();
    await expect(home.pitchVideo).toHaveAttribute('controls', '');
    await expect(home.pitchVideo).toHaveAttribute('preload', 'metadata');
    await expect(home.pitchVideo).toHaveAttribute('poster', /pitch-poster/);
    await expect(home.pitchVideo).not.toHaveAttribute('autoplay');
    await expect(home.pitchCaptions).toHaveAttribute('srclang', 'en');
    await expect(home.pitchVideo).toHaveJSProperty('paused', true);
  });

  test('is reachable by keyboard', async ({ home }) => {
    await home.goto();

    let focused = false;
    for (let i = 0; i < 12 && !focused; i++) {
      await home.page.keyboard.press('Tab');
      focused = await home.pitchVideo.evaluate((el) => el === document.activeElement);
    }
    expect(focused).toBe(true);
  });

  test('sits beside the hero copy at 1280 and below the services on a phone', async ({ home }) => {
    await home.page.setViewportSize({ width: 1280, height: 800 });
    await home.goto();
    const hero = await home.heading.boundingBox();
    const wide = await home.pitchVideo.boundingBox();
    expect(wide!.x).toBeGreaterThan(hero!.x + hero!.width);
    expect(Math.abs(wide!.y - hero!.y)).toBeLessThan(120);
    const form = await home.contactSection.boundingBox();
    expect(form!.y + form!.height).toBeLessThanOrEqual(1100);

    await home.page.setViewportSize({ width: 375, height: 800 });
    const services = await home.serviceCards.last().boundingBox();
    const narrow = await home.pitchVideo.boundingBox();
    expect(narrow!.y).toBeGreaterThan(services!.y + services!.height);
    expect(narrow!.width).toBeCloseTo(services!.width, -1);
  });
});
