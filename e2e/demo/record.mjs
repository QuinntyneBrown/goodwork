// Records the Goodwork demo: one continuous take of every user journey, against the real app.
//   node demo/record.mjs
// Prerequisite: `node demo/synthesize.mjs` (narration clips). Output: .demo-run/staging/{raw.webm,events.json}.
// This is not part of the acceptance run: it starts the API, builds the app, and uses a disposable database.
import { execFileSync, spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { Presenter } from './presenter.mjs';

const e2e = fileURLToPath(new URL('..', import.meta.url));
const root = `${e2e}../`;
const run = `${e2e}.demo-run/`;
const staging = `${run}staging/`;
const webroot = `${run}webroot/`;
const database = `${run}demo.db`;
const outbox = `${run}outbox/`;
const apiDir = `${root}backend/src/Goodwork.Api/`;
const cliDll = `${root}backend/src/Goodwork.Cli/bin/Debug/net10.0/Goodwork.Cli.dll`;
const apiDll = `${apiDir}bin/Debug/net10.0/Goodwork.Api.dll`;

const TAKE_DEADLINE_MS = 10 * 60_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const step = (message) => console.log(`[demo] ${message}`);

const DEMO_EMAIL = 'ruth.okonkwo@hopehouse.org';
const DEMO_MESSAGE =
  'We run a transitional housing program in Hamilton and need one simple app our case workers can use on their phones.';
const SECOND_EMAIL = 'jordan@gracechurch.example';
const SECOND_MESSAGE = 'We would love a volunteer sign-up page for our church.';

function insideRun(path) {
  if (!path.startsWith(run))
    throw new Error(`Refusing to touch ${path}: not inside the demo run directory`);
  return path;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function preflight() {
  for (const [command, args] of [
    ['ffmpeg', ['-version']],
    ['ffprobe', ['-version']],
    ['sqlite3', ['-version']],
    ['dotnet', ['--version']],
  ]) {
    execFileSync(command, args, { stdio: 'ignore' });
  }
  if (!existsSync(`${run}clips/manifest.json`))
    throw new Error('Run `node demo/synthesize.mjs` first: no narration clips.');
}

function prepare() {
  step('building the Angular app');
  execFileSync('npm', ['--prefix', `${root}frontend`, 'run', 'build'], { stdio: 'ignore' });
  rmSync(insideRun(webroot), { recursive: true, force: true });
  cpSync(`${root}frontend/dist/goodwork/browser`, webroot, { recursive: true });

  step('building the API and CLI');
  for (const project of ['Goodwork.Api', 'Goodwork.Cli']) {
    execFileSync(
      'dotnet',
      ['build', `${root}backend/src/${project}`, '-c', 'Debug', '--nologo', '-v', 'q'],
      { stdio: 'ignore' },
    );
  }

  step('creating a disposable database');
  for (const suffix of ['', '-shm', '-wal'])
    rmSync(insideRun(`${database}${suffix}`), { force: true });
  rmSync(insideRun(outbox), { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  execFileSync('dotnet', [cliDll, 'migrate'], {
    env: { ...process.env, ConnectionStrings__Goodwork: `Data Source=${database}` },
    stdio: 'ignore',
  });
}

// Development mode expects the project's own (git-ignored) wwwroot to exist, even though the site is served from the run directory.
const projectWebroot = `${apiDir}wwwroot`;
let createdProjectWebroot = false;

async function startApi(port) {
  const log = `${run}api.log`;
  if (!existsSync(projectWebroot)) {
    mkdirSync(projectWebroot);
    createdProjectWebroot = true;
  }
  const child = spawn('dotnet', [apiDll], {
    cwd: apiDir,
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: 'Development',
      ASPNETCORE_URLS: `http://127.0.0.1:${port}`,
      ASPNETCORE_WEBROOT: webroot,
      ConnectionStrings__Goodwork: `Data Source=${database}`,
      Smtp__PickupDirectory: outbox,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks = [];
  child.stdout.on('data', (c) => chunks.push(c));
  child.stderr.on('data', (c) => chunks.push(c));
  child.on('exit', () => writeFileSync(log, Buffer.concat(chunks)));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) return { child, base };
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('The API did not start; see .demo-run/api.log');
}

async function stopApi(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  for (let i = 0; i < 20 && child.exitCode === null; i++) await sleep(500);
  if (child.exitCode === null) child.kill('SIGKILL');
}

const storedCount = (email) =>
  Number(
    execFileSync('sqlite3', [
      database,
      `select count(*) from ContactRequests where Email = '${email}';`,
    ])
      .toString()
      .trim(),
  );

async function waitFor(check, what, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const value = await check();
    if (value) return value;
    await sleep(400);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

const deliveredEmail = () => {
  if (!existsSync(outbox)) return null;
  for (const name of readdirSync(outbox)) {
    const text = readFileSync(`${outbox}${name}`, 'utf8');
    if (text.includes(DEMO_EMAIL)) return text;
  }
  return null;
};

async function seedEarlierRequests(base) {
  step('sending four earlier requests through the public API');
  for (let i = 1; i <= 4; i++) {
    const response = await fetch(`${base}/api/contact-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `earlier${i}@example.org`,
        message: `Earlier test request number ${i}.`,
      }),
    });
    if (response.status !== 202)
      throw new Error(`Seeding request ${i} returned ${response.status}`);
  }
}

async function record(base) {
  const clips = JSON.parse(readFileSync(`${run}clips/manifest.json`, 'utf8'));
  rmSync(insideRun(`${staging}video`), { recursive: true, force: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'light',
    recordVideo: { dir: `${staging}video`, size: { width: 1280, height: 720 } },
  });
  context.setDefaultTimeout(30_000);
  context.setDefaultNavigationTimeout(30_000);
  const page = await context.newPage();
  const video = page.video();
  const presenter = new Presenter(page, clips, { captions: process.argv.includes('--captions') });
  await presenter.install();

  const statuses = [];
  page.on('response', (r) => {
    if (r.url().endsWith('/api/contact-requests')) statuses.push(r.status());
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  const throttle = (latency) =>
    cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

  const heading = page.getByRole('heading', { level: 1 });
  const emailField = page.getByLabel('Email');
  const messageField = page.getByLabel('What are you working on?');
  const sendButton = page.getByRole('button', { name: /Send request|Try again/ });
  const startProject = page.getByRole('link', { name: 'Start a project' });
  const summary = page.getByRole('alert').filter({ hasText: 'to fix before we can send this' });
  const confirmation = page.getByRole('status').filter({ hasText: 'Request sent.' });
  const failure = page.getByRole('alert').filter({ hasText: "We couldn't send your request" });
  const toTop = async () => {
    await page.evaluate(() => {
      document.activeElement?.blur();
      scrollTo({ top: 0, behavior: 'instant' });
    });
  };

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await heading.waitFor();
  presenter.start();

  // 1. Opening
  await presenter.card(
    {
      mark: true,
      tag: 'Goodwork',
      title: 'Software for people doing good work',
      subtitle: 'A quick tour of the site, one journey at a time',
    },
    'opening-card',
  );
  await presenter.narrate('opening-1');
  await presenter.hideCard();
  await presenter.pause(900);

  // 2. Meet Goodwork
  await presenter.narrate('meet-1');
  const servicesTop = await page
    .getByRole('heading', { name: 'What we build' })
    .evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await presenter.narrate('meet-2', () => presenter.glideTo(220, 2600));
  await presenter.narrate('meet-3', async () => {
    await presenter.pause(600);
    await presenter.glideTo(Math.max(0, servicesTop - 110), 2600);
  });
  await presenter.glideTo(0, 1200);

  // 3. Light and dark
  await presenter.narrate('theme-1', async () => {
    await presenter.pause(4800);
    await page.emulateMedia({ colorScheme: 'dark' });
    await presenter.pause(4300);
    await page.emulateMedia({ colorScheme: 'light' });
  });

  // 4. On a phone
  await presenter.narrate('phone-1', async () => {
    await presenter.pause(1000);
    await page.setViewportSize({ width: 360, height: 640 });
    await presenter.pause(900);
    const height = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await presenter.glideTo(height * 0.5, 3200);
    await presenter.glideTo(height, 2600);
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await toTop();
  await presenter.pause(900);

  // 5. Keyboard only
  await presenter.narrate('keyboard-1', async () => {
    await presenter.pause(5200);
    await page.keyboard.press('Tab');
    await presenter.pause(3300);
    await page.keyboard.press('Enter');
    await presenter.pause(2200);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      await presenter.pause(900);
    }
  });
  await toTop();
  await presenter.pause(700);

  // 6. Start a project
  await presenter.narrate(
    'start-1',
    async () => {
      await presenter.pause(3600);
      await presenter.click(startProject);
      await emailField.waitFor();
      if (!(await emailField.evaluate((el) => el === document.activeElement)))
        throw new Error('Start a project did not focus the email field');
    },
    { position: 'left' },
  );

  // 7. Fixing mistakes
  await presenter.narrate(
    'mistakes-1',
    async () => {
      await presenter.pause(7800);
      await presenter.click(sendButton);
      await summary.waitFor();
      if (!(await summary.evaluate((el) => el === document.activeElement)))
        throw new Error('The error summary did not take focus');
    },
    { position: 'left' },
  );
  await presenter.narrate(
    'mistakes-2',
    async () => {
      await presenter.pause(700);
      await presenter.click(summary.getByRole('link', { name: 'Enter a complete email address' }));
      await presenter.pause(1300);
      await emailField.pressSequentially(DEMO_EMAIL, { delay: 55 });
      await page.locator('#email-error').waitFor({ state: 'detached' });
    },
    { position: 'left' },
  );

  // 8. Sending a request
  await presenter.narrate(
    'sending-1',
    async () => {
      await presenter.pause(1200);
      await presenter.click(messageField);
      await messageField.pressSequentially(DEMO_MESSAGE, { delay: 28 });
      await throttle(3000);
      await presenter.pause(500);
      await presenter.click(sendButton);
      await page.getByRole('button', { name: 'Sending…' }).waitFor();
    },
    { position: 'left' },
  );
  await presenter.narrate(
    'sending-2',
    async () => {
      await confirmation.waitFor();
      await throttle(0);
      await waitFor(() => storedCount(DEMO_EMAIL) === 1, 'the request to be stored', 10_000);
    },
    { position: 'left' },
  );

  // 9. Another request, and protection from spam
  await presenter.narrate(
    'another-1',
    async () => {
      await presenter.pause(1500);
      await presenter.click(page.getByRole('button', { name: 'Send another request' }));
      await emailField.waitFor();
      await emailField.pressSequentially(SECOND_EMAIL, { delay: 40 });
      await messageField.pressSequentially(SECOND_MESSAGE, { delay: 30 });
      await presenter.pause(400);
      await presenter.click(sendButton);
    },
    { position: 'left' },
  );
  await presenter.narrate(
    'spam-1',
    async () => {
      await failure.waitFor();
      if (statuses.at(-1) !== 429)
        throw new Error(
          `Expected the sixth request to be refused with 429, got ${statuses.at(-1)}`,
        );
      if ((await messageField.inputValue()) !== SECOND_MESSAGE)
        throw new Error('The message was not kept after the refusal');
      if (storedCount(SECOND_EMAIL) !== 0) throw new Error('The refused request was stored');
      await page.evaluate(() =>
        document.querySelector('gw-contact-form')?.scrollIntoView({ block: 'start' }),
      );
    },
    { position: 'left' },
  );

  // 10. It reaches the studio
  let email = null;
  await presenter.narrate(
    'studio-1',
    async () => {
      email = await waitFor(deliveredEmail, 'the delivered email in the outbox', 60_000);
    },
    { position: 'left' },
  );
  await presenter.narrate('studio-2', () =>
    presenter.card(
      { tag: 'Studio inbox', title: 'New Goodwork contact request', mono: email.trim() },
      'email-card',
    ),
  );
  await presenter.clearCaption();
  await presenter.hideCard();
  await presenter.pause(600);

  // 11. Closing
  await presenter.card(
    {
      mark: true,
      tag: 'Goodwork',
      title: 'Tell us about your project',
      subtitle: 'Software for people doing good work',
    },
    'closing-card',
  );
  await presenter.narrate('closing-1');
  await presenter.pause(1500);

  writeFileSync(`${staging}events.json`, JSON.stringify(presenter.events, null, 2));
  await context.close();
  await video.saveAs(`${staging}raw.webm`);
  await browser.close();
  step(`take recorded: ${(presenter.now() / 1000).toFixed(1)} s on the capture clock`);
}

let api = null;
const deadline = setTimeout(() => {
  console.error('[demo] The take exceeded its deadline');
  stopApi(api?.child).finally(() => process.exit(2));
}, TAKE_DEADLINE_MS);
try {
  preflight();
  prepare();
  api = await startApi(await freePort());
  await seedEarlierRequests(api.base);
  await record(api.base);
} catch (error) {
  console.error(`[demo] FAILED: ${error.stack ?? error}`);
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  await stopApi(api?.child);
  if (createdProjectWebroot) rmSync(projectWebroot, { recursive: true, force: true });
}
