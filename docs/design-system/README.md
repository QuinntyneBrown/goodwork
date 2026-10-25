# Goodwork design system

Extracted from [docs/mocks](../mocks/README.md) on 2026-10-23. Open [index.html](index.html) locally. The brochure mocks now link this system's tokens and components.

## Foundations
| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Brand palette, roles, status, every contrast pair live |
| [Typography](foundations/typography.html) | Serif and sans, scale, roles |
| [Spacing](foundations/spacing.html) | 4px scale, control heights |
| [Layout](foundations/layout.html) | Breakpoints, grid, templates, the 1100px brochure |
| [Elevation](foundations/elevation.html) | Shadows, surface ladder, z-order |
| [Shape](foundations/shape.html) | Radii, borders |
| [Motion](foundations/motion.html) | Durations, easing, reduced motion |
| [Iconography](foundations/iconography.html) | Icon set and rules |
| [Theming](foundations/theming.html) | Light, reversed dark, adding a theme, tokens.json |
| [Responsive](foundations/responsive.html) | Per-component breakpoint rules |
| [Accessibility](foundations/accessibility.html) | WCAG 2.2 AA commitments, focus ring |
| [Content](foundations/content.html) | Voice, formulas, microcopy |

## Components
| Component | Variants | States | Source mocks |
|---|---|---|---|
| [Button](components/button.html) | Primary, secondary, ghost, link, danger.; Icon-only buttons carry aria-label; the icon is  | Default, Hover, Focus, Active, Disabled, Loading | pages/home/default, pages/home/sending, pages/home/error |
| [Link](components/link.html) | Inline, standalone with an arrow, external with an announced new tab. | Default, Hover, Focus | pages/home/default, pages/home/error |
| [Menu](components/menu.html) | Checkable items and a disabled item. | Default, Hover, Disabled | core, not in mocks |
| [Text field](components/text-field.html) | Email, with a prefix addon, search with an icon. | Default, Hover, Focus, Invalid, Read-only, Disabled | pages/home/default, pages/home/invalid, pages/home/sending |
| [Textarea](components/textarea.html) | With help text and a counter. | Default, Focus, Invalid, Read-only, Disabled | pages/home/default, pages/home/invalid, pages/home/sent |
| [Select](components/select.html) | With a placeholder option. | Default, Hover, Focus, Invalid, Disabled | core, not in mocks |
| [Checkbox](components/checkbox.html) | A group in a fieldset with a legend. | Unchecked, Checked, Indeterminate, Focus, Invalid, Disabled | core, not in mocks |
| [Radio group](components/radio-group.html) | Vertical, the default. | Unchecked, Checked, Focus, Invalid, Disabled | core, not in mocks |
| [Switch](components/switch.html) | Label right (default) and label left. | Off, On, Focus, Disabled | core, not in mocks |
| [Form field](components/form-field.html) | Optional field with help. | Default, Invalid | pages/home/default, pages/home/invalid |
| [Form layout](components/form-layout.html) | Marketing actions (left, with hint) and app actions (right aligned, primary last). | Default, Invalid, Submitting | pages/home/default, pages/home/invalid, pages/home/sending, pages/home/error |
| [Top bar](components/top-bar.html) | Marketing, from the mocks.; Menu button, brand, account. | Default, CTA hover, CTA focus | pages/home/default, pages/home/error |
| [Sidebar navigation](components/sidebar-navigation.html) | Grouped, with a count. | Default, Hover, Focus, Current | core, not in mocks |
| [Tabs](components/tabs.html) | With counts. | Default, Hover, Focus, Selected | core, not in mocks |
| [Breadcrumb](components/breadcrumb.html) | Full path. | Default, Hover, Current | core, not in mocks |
| [Pagination](components/pagination.html) | Numbered. | Default, Hover, Focus, Current, Disabled | core, not in mocks |
| [Skip link](components/skip-link.html) | Shown as it looks when focused. | Hidden, Focused | pages/home/default, pages/home/invalid, pages/home/sending, pages/home/sent, pages/home/error |
| [Footer](components/footer.html) | Contained, from the mocks. | Default, Link hover, Link focus | pages/home/default |
| [Card](components/card.html) | Default, interactive, selected. | Default, Hover, Selected | pages/home/default |
| [Dialog](components/dialog.html) | Destructive. | Default, Busy | core, not in mocks |
| [Tooltip](components/tooltip.html) | Text. | Hidden, Visible | core, not in mocks |
| [Divider](components/divider.html) | Horizontal. | Default | pages/home/default |
| [Container, grid and stack](components/layout-primitives.html) | Grid: 4, 8 or 12 columns by breakpoint. | Default | pages/home/default |
| [Table](components/table.html) | Default with a selected row; numbers right aligned. | Default, Hover, Selected | core, not in mocks |
| [List](components/list.html) | Static and interactive rows. | Default, Hover | pages/home/default |
| [Description list](components/description-list.html) | Horizontal. | Default | core, not in mocks |
| [Avatar](components/avatar.html) | Small, medium, large, group. | Default | core, not in mocks |
| [Badge](components/badge.html) | Neutral, four tones, count. | Default | core, not in mocks |
| [Chip](components/chip.html) | Filter, and removable. | Default, Hover, Focus, Selected | core, not in mocks |
| [Toast](components/toast.html) | Success with undo, error with retry. | Default, Action focus | core, not in mocks |
| [Alert](components/alert.html) | Info, success, warning, danger. | Default, Action focus | pages/home/invalid, pages/home/sent, pages/home/error |
| [Inline message](components/inline-message.html) | Help, error, success status. | Help, Error, Saving | pages/home/invalid |
| [Progress bar](components/progress-bar.html) | Determinate, indeterminate, success. | Determinate | core, not in mocks |
| [Spinner](components/spinner.html) | Medium and large. | Default | pages/home/sending |
| [Skeleton](components/skeleton.html) | Card skeleton. | Loading | core, not in mocks |
| [Empty state](components/empty-state.html) | First run, and error. | First run | core, not in mocks |
| [Error page](components/error-page.html) | 404, 500 with a reference, offline. | Default | core, not in mocks |
| [Brand lockup](components/brand-lockup.html) | Standard and reversed. | Default, Focus | pages/home/default |
| [Hero](components/hero.html) | From the mock. | Default | pages/home/default |
| [Service card](components/service-card.html) | Pair, from the mock. | Default | pages/home/default |
| [Video player](components/video-player.html) | Native player with poster and captions. | Default, Focus | pages/home/default |
| [Process step](components/process-step.html) | Four numbered steps, from the mock. | Default | pages/home/default |
| [Disclosure](components/disclosure.html) | FAQ list, one open. | Closed, Open, Focus | pages/home/default |

## Patterns
| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | The contact form's five states |
| [Feedback & loading](patterns/feedback-and-loading.html) | Busy, success, toast, skeleton |
| [Empty & error states](patterns/empty-and-error-states.html) | Send failure, empties, error pages |
| [Navigation & page structure](patterns/navigation-and-page-structure.html) | One-page shell and app shell |
| [Dialogs & overlays](patterns/dialogs-and-overlays.html) | Dialog, drawer, popover, menu |
| [Data tables & lists](patterns/data-tables-and-lists.html) | Tables, lists, service cards |
| [Notifications](patterns/notifications.html) | Toast, banner, inline |
| [Content & tone](patterns/content-and-tone.html) | Cost and faith stated plainly |

## Tokens
- [tokens/tokens.css](tokens/tokens.css): source of truth. Light on `:root`; dark is the reversed brand palette.
- [tokens/tokens.json](tokens/tokens.json): DTCG export, regenerated from the CSS.
- [tokens/contrast-pairs.json](tokens/contrast-pairs.json): every checked foreground and background pair.
- [assets/components.css](assets/components.css): component stylesheet, token driven.

## Drift found in the mocks
| Mock | Issue | Resolution |
|---|---|---|
| all `pages/home/*` | Focus ring used raw Cornerstone Gold, about 2.9:1 on Linen, under the 3:1 minimum. | Light focus ring is now gold-700; dark keeps gold-300. |
| all `pages/home/*` | Dark `--color-fg-subtle` was about 4.1:1 on raised surfaces. | Raised to sand-50, now above 4.5:1. |
| kit (`ui.css`) | Toast icons used status tints that fall under 3:1 on the inverse surface in both themes. | Icons inherit the text colour; tone comes from icon shape and title. |
| `pages/home/default` | Wordmark letter spacing was a raw -0.015em from the brand sheet. | Snapped to `--letter-spacing-tight`. |
| `pages/home/default` | `.site-footer` duplicated the kit's `.footer`. | Kept as the documented contained variant so the mocks keep working. |
| `pages/home/default` at 360px | Hero headline used the 48px display size on phones and wrapped to five lines. | Fixed during mock review: h1 size below 768px. |
| mocks `assets/` | Brand tokens were appended as override blocks on top of the starter values. | Consolidated into one clean `tokens.css`; the mocks' local copies were removed. |

## Verification

```sh
python3 .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css
python3 .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system
python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks
python3 .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/design-system --out docs/design-system/.cache/shots
```

Results on 2026-10-23:

| Check | Result |
|---|---|
| Contrast, light and dark | 128 passed, 0 failed |
| Design-system structure | 61 pages, 0 errors, 0 warnings |
| Mocks after linking this system | 5 mocks, 0 errors, 0 warnings |
| Horizontal overflow at 360px, all 61 pages | none |
| Brochure height at 1280px wide | 1043px, under the 1100px limit |

Screenshots of the index, color, button, text field and top bar pages were reviewed at 360px and 1280px in both themes. Review found and fixed: light-theme comparison panels rendering dark inside a dark page (added a `[data-theme="light"]` token scope), and phone overflow from hidden labels escaping scroll containers and fixed-width demo figures.
