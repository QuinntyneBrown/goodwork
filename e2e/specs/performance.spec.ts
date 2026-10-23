// Acceptance Test
// Traces to: L2-015
// Description: On an emulated mid-range phone over 4G the page reaches LCP under 2.5 s, CLS under 0.1
// and INP under 200 ms; initial JavaScript is under 200 KB compressed; fonts are self-hosted.

import { devices } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { expect, test } from "../fixtures/test";

test.use({ ...devices["Pixel 7"] });

test.describe("Front-end performance", () => {
  test("meets the Core Web Vitals budget on a throttled phone", async ({
    home,
    context,
  }) => {
    const cdp = await context.newCDPSession(home.page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await home.page.addInitScript(() => {
      const vitals = { lcp: 0, cls: 0, inp: 0 };
      (window as unknown as { __vitals: typeof vitals }).__vitals = vitals;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) vitals.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[]) {
          if (!entry.hadRecentInput) vitals.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          vitals.inp = Math.max(vitals.inp, entry.duration);
      }).observe({
        type: "event",
        durationThreshold: 16,
        buffered: true,
      } as PerformanceObserverInit);
    });

    await home.page.goto("/", { waitUntil: "load" });
    await expect(home.heading).toBeVisible();
    await home.page.waitForTimeout(1500);
    await home.startProject.tap();
    await home.page.waitForTimeout(500);
    const vitals = await home.page.evaluate(
      () =>
        (window as unknown as { __vitals: Record<string, number> }).__vitals,
    );

    expect(vitals["lcp"], "LCP ms").toBeLessThan(2500);
    expect(vitals["cls"], "CLS").toBeLessThan(0.1);
    expect(vitals["inp"], "INP ms").toBeLessThan(200);
  });

  test("loads under 200 KB of compressed initial JavaScript and no third-party font host", async ({
    home,
  }) => {
    const scripts: Buffer[] = [];
    home.page.on("response", async (response) => {
      if (response.request().resourceType() === "script")
        scripts.push(await response.body());
    });

    await home.goto();
    await home.page.waitForLoadState("networkidle");

    const compressed = scripts.reduce(
      (total, body) => total + gzipSync(body).length,
      0,
    );
    expect(compressed).toBeLessThan(200 * 1024);
    // The fixture fails the test if any request left the app's own origin, so reaching here also
    // proves the fonts were served by the app itself.
    const fontFamilies = await home.page.evaluate(() =>
      [...document.fonts].map((f) => f.family),
    );
    expect(fontFamilies.some((f) => f.includes("Inter"))).toBe(true);
  });
});
