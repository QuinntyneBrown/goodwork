# Goodwork mocks

Static HTML mocks for the Goodwork brochure page: a single page whose opening
section (a short company description, two services, the pitch video and a
contact request form) ends within 1100px at desktop width, followed by a
products placeholder, the work process and frequently asked questions.

<!-- Cast & catalog
  Company:   Goodwork, Toronto, Ontario · hello@goodwork.rocks
  Prospect:  Ruth Okonkwo, Hope House (transitional housing non-profit, Toronto)
  Today:     Thu 23 Oct 2026
  Reply SLA: two business days
-->

## Open the mocks

Open `index.html` from disk. Each mock has a bar at the bottom listing sibling
states and a theme toggle. Query parameters: `?theme=dark` forces the dark
theme (the reversed brand palette: evergreen ink canvas, linen text, gold
accent); `?chrome=0` hides the mock bar and notes so the page looks like the
product.

## Design system

The mocks link the extracted design system instead of local copies:
`../design-system/tokens/tokens.css` and `../design-system/assets/components.css`.
Only the mock chrome (`assets/mock.css`, `assets/mock.js`) lives here.
See [the design system](../design-system/README.md).

## Decisions and assumptions

- Single page, no 404/500/offline screens (confirmed with the owner).
- Logo: the Cornerstone mark, inline SVG, ink blocks with one gold block.
- Faith tone: warm and understated. One sentence in the description names the
  studio as Christian-owned; no verse.
- Pricing: no numbers. One line explains why the cost is low (small senior team,
  AI-assisted spec-driven process, fixed-price quotes).
- Services: web and mobile apps; websites.
- Contact form: email and message only. States: default, invalid, sending,
  sent, error. Replies promised within two business days.
- The 1100px height limit applies to the opening section at 1280px wide; phone
  and tablet stack and scroll naturally.
- Products: a placeholder card marked "Coming soon" until the first product
  ships.
- Work process: the FaithTech Playbook 2.0 cycle (Lament, Discern, Build,
  Steward), credited with a link to faithtech.com.
- FAQ: native `details`/`summary` disclosures, all closed on load.
- `loading` and `empty` page states are not applicable (reasons in
  `manifest.json`).

## Open questions

- Company location and email address: Toronto, Ontario; hello@goodwork.rocks.
- Web fonts: the brand sheet uses Inter and Source Serif 4 from Google Fonts.
  Mocks open from disk without network, so they fall back to system sans and
  Georgia. The production site should self-host both fonts.
- Where contact requests go (email inbox, CRM, both) is not decided; the sent
  state only promises a reply.

## Re-check and re-screenshot

```sh
python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write
python3 .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks
```

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | invalid | sending | sent | Requirements |
|---|---|---|---|---|---|---|---|---|
| Home (`home`) | [✅](pages/home/default.html) | ➖ | ➖ | [✅](pages/home/error.html) | [✅](pages/home/invalid.html) | [✅](pages/home/sending.html) | [✅](pages/home/sent.html) | L2-001 to L2-016 |

<!-- coverage:end -->
