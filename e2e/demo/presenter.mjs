// Presentation helper for the demo take: title cards, captions, a visible cursor and timestamp logging.
// Everything is drawn in a shadow root with pointer-events: none, and strings are set as text,
// so the overlay never touches the application's own DOM or layout.

/** Runs inside the page, before any app script (page.addInitScript). */
function installOverlay() {
  const css = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .card { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 18px; padding: 48px 48px 150px; text-align: center; background: #10241c; color: #f6f1e6; opacity: 0; transition: opacity 500ms ease;
      font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    .card.on { opacity: 1; }
    .card .mark { width: 72px; height: 72px; }
    .card h1 { margin: 0; font: 600 54px/1.1 'Source Serif 4', Georgia, serif; letter-spacing: -0.01em; }
    .card p { margin: 0; font-size: 24px; line-height: 1.4; color: #d9d2bf; max-width: 880px; }
    .card pre { margin: 0; text-align: left; font: 500 21px/1.5 ui-monospace, Menlo, monospace; color: #f6f1e6;
      background: #0a1812; border: 1px solid #3b5a4c; border-radius: 12px; padding: 24px 32px; max-width: 980px; white-space: pre-wrap; }
    .card .tag { font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #d4a640; font-weight: 600; }
    .caption { position: fixed; left: 50%; translate: -50% 0; max-width: min(92vw, 1000px); padding: 14px 22px; border-radius: 14px;
      background: rgba(16, 36, 28, 0.93); color: #f6f1e6; font: 500 clamp(14px, 1.75vw, 22px)/1.4 'Inter', ui-sans-serif, system-ui, sans-serif;
      text-align: center; box-shadow: 0 6px 24px rgba(0,0,0,0.35); opacity: 0; transition: opacity 250ms ease; }
    .caption.on { opacity: 1; }
    .caption.bottom { bottom: 18px; } .caption.top { top: 78px; }
    .caption.left { left: 24px; bottom: 18px; translate: none; max-width: 560px; text-align: left; }
    .cursor { position: fixed; left: -40px; top: -40px; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
      background: rgba(212, 166, 64, 0.85); border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); transition: transform 120ms ease; }
    .cursor.down { transform: scale(1.7); }
  `;
  const make = () => {
    if (window.__demoRoot || !document.documentElement) return !!window.__demoRoot;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css;
    const card = Object.assign(document.createElement('div'), { className: 'card' });
    const caption = Object.assign(document.createElement('div'), { className: 'caption bottom' });
    const cursor = Object.assign(document.createElement('div'), { className: 'cursor' });
    root.append(style, card, caption, cursor);
    document.documentElement.appendChild(host);
    window.__demoRoot = { card, caption, cursor };
    return true;
  };
  const observer = new MutationObserver(() => make() && observer.disconnect());
  observer.observe(document, { childList: true, subtree: true });
  make();
  addEventListener(
    'mousemove',
    (e) => {
      const c = window.__demoRoot?.cursor;
      if (c) {
        c.style.left = `${e.clientX}px`;
        c.style.top = `${e.clientY}px`;
      }
    },
    true,
  );
  addEventListener('mousedown', () => window.__demoRoot?.cursor.classList.add('down'), true);
  addEventListener('mouseup', () => window.__demoRoot?.cursor.classList.remove('down'), true);

  const NS = 'http://www.w3.org/2000/svg';
  const brandMark = () => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('class', 'mark');
    for (const [x, y, w, h, fill] of [
      [4, 4, 17, 12, '#f6f1e6'],
      [27, 4, 17, 12, '#f6f1e6'],
      [4, 22, 17, 22, '#d4a640'],
      [27, 22, 17, 22, '#f6f1e6'],
    ]) {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x);
      r.setAttribute('y', y);
      r.setAttribute('width', w);
      r.setAttribute('height', h);
      r.setAttribute('rx', 2.5);
      r.setAttribute('fill', fill);
      svg.append(r);
    }
    return svg;
  };
  const el = (tag, text, className) =>
    Object.assign(document.createElement(tag), { textContent: text, className: className ?? '' });

  window.__demo = {
    ready: () => make(),
    showCard({ tag, title, subtitle, mono, mark }) {
      make();
      const card = window.__demoRoot.card;
      card.replaceChildren(
        ...[
          mark ? brandMark() : null,
          tag ? el('div', tag, 'tag') : null,
          title ? el('h1', title) : null,
          subtitle ? el('p', subtitle) : null,
          mono ? el('pre', mono) : null,
        ].filter(Boolean),
      );
      requestAnimationFrame(() => card.classList.add('on'));
    },
    hideCard() {
      window.__demoRoot?.card.classList.remove('on');
    },
    showCaption(text, position) {
      make();
      const caption = window.__demoRoot.caption;
      caption.textContent = text;
      caption.className = `caption ${position} on`;
    },
    hideCaption() {
      window.__demoRoot?.caption.classList.remove('on');
    },
    async scrollTo(top, ms) {
      const start = scrollY;
      const t0 = performance.now();
      await new Promise((resolve) => {
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          scrollTo({ top: start + (top - start) * eased, behavior: 'instant' });
          k < 1 ? requestAnimationFrame(step) : resolve();
        };
        requestAnimationFrame(step);
      });
    },
  };
}

const MARGIN_MS = 700;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class Presenter {
  /** @param page Playwright page  @param clips manifest paragraphs with a measured `duration` in seconds */
  constructor(page, clips, { captions = false } = {}) {
    this.page = page;
    this.captions = captions;
    this.clips = new Map(clips.map((c) => [c.id, c]));
    this.events = [];
    this.t0 = Date.now();
  }

  now() {
    return Date.now() - this.t0;
  }

  log(type, id) {
    this.events.push({ type, id, ms: this.now() });
  }

  async install() {
    await this.page.addInitScript(installOverlay);
  }

  /** Starts the capture clock. Call once the page has been created and the first navigation committed. */
  start() {
    this.t0 = Date.now();
  }

  async card(options, id = options.title) {
    await this.page.evaluate((o) => window.__demo.showCard(o), options);
    this.log('card', id);
  }

  async hideCard() {
    await this.page.evaluate(() => window.__demo.hideCard());
  }

  /**
   * Shows a paragraph as a caption (only when captions are on), runs the actions while it is "spoken", then waits until the clip has
   * finished plus a short margin, so the narrator is never talking over the next paragraph.
   */
  async narrate(id, actions = async () => {}, { position = 'bottom' } = {}) {
    const clip = this.clips.get(id);
    if (!clip) throw new Error(`No narration paragraph "${id}"`);
    if (this.captions)
      await this.page.evaluate(
        ([text, pos]) => window.__demo.showCaption(text, pos),
        [clip.text, position],
      );
    const started = this.now();
    this.log('caption', id);
    await actions();
    const remaining = clip.duration * 1000 + MARGIN_MS - (this.now() - started);
    if (remaining > 0) await sleep(remaining);
  }

  async clearCaption() {
    await this.page.evaluate(() => window.__demo.hideCaption());
  }

  async glideTo(top, ms = 1800) {
    await this.page.evaluate(([t, d]) => window.__demo.scrollTo(t, d), [top, ms]);
  }

  /** Moves the visible cursor to the element, pauses, then clicks. */
  async click(locator) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 28 });
    await sleep(350);
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  pause(ms) {
    return sleep(ms);
  }
}
