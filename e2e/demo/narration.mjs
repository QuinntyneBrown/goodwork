// Parses docs/demo/goodwork-narration.md into ordered paragraphs: { id, chapter, title, text, spoken }.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../../docs/demo/', import.meta.url));

export const VOICE = process.env.EDGE_VOICE ?? 'en-US-AvaMultilingualNeural';
export const RATE = process.env.EDGE_RATE ?? '+8%';
export const PITCH = process.env.EDGE_PITCH ?? '+3Hz';

export function loadNarration() {
  const lexicon = JSON.parse(readFileSync(`${docs}pronunciations.json`, 'utf8'));
  const paragraphs = [];
  let chapter = null;
  let title = '';
  let count = 0;
  for (const block of readFileSync(`${docs}goodwork-narration.md`, 'utf8').split(/\n\s*\n/)) {
    const text = block.trim();
    const heading = /^## (\S+) — (.+)$/.exec(text);
    if (heading) {
      [, chapter, title] = heading;
      count = 0;
    } else if (chapter && text && !text.startsWith('#')) {
      count += 1;
      const spoken = Object.entries(lexicon).reduce(
        (s, [written, say]) => s.replaceAll(written, say),
        text,
      );
      paragraphs.push({ id: `${chapter}-${count}`, chapter, title, text, spoken });
    }
  }
  return paragraphs;
}

export const clipKey = (spoken) =>
  createHash('sha1').update(`${VOICE}|${RATE}|${PITCH}|${spoken}`).digest('hex').slice(0, 12);
