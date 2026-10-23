import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const dir = path.dirname(fileURLToPath(import.meta.url));
const html = 'file://' + path.join(dir, 'card.html');
const out = path.join(dir, 'out');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 360, height: 216 }, deviceScaleFactor: 300 / 96 });
const page = await ctx.newPage();
for (const side of ['front', 'back']) {
  await page.goto(`${html}?side=${side}`); await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: `${out}/goodwork-business-card-${side}.pdf`, width: '3.75in', height: '2.25in', printBackground: true, preferCSSPageSize: true });
  await page.screenshot({ path: `${out}/goodwork-business-card-${side}-300dpi.png`, fullPage: false });
  await page.goto(`${html}?side=${side}&proof=1`); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/proof-${side}-guides.png` });
}
await browser.close();
