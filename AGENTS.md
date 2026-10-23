# goodwork

## Purpose

The following description was supplied when this file was generated, quoted for reference:
```text
Goodwork is a small software studio that builds websites and custom applications for non-profits, churches and ministries, and companies whose work makes life better for someone. We bring the same quality a large agency would, without the agency price.

reposiotyry is a full stack responsive web app. .NET on backend and Angular on frontend
```

## Technology

- Use .NET for the API.
- Use MediatR, pinned to **12.5.0**. Do not upgrade. 12.5.0 is the last release
  under plain Apache-2.0; from 13.0.0 MediatR is commercially licensed, free only
  under a registered Community tier that lapses above $5M USD annual revenue.
- Use Microsoft.Extensions libraries and patterns: dependency injection, Options,
  and Configuration.
- Use Angular for the web client.

## Architecture and Design

- Implement requirements radically simply: the least code that satisfies the
  acceptance criteria, and nothing more. Simple in design, never reduced in scope.
- Apply SOLID principles throughout the codebase.
- Organize features and behaviors into vertical slices.
- Keep back-end code in `backend/`, with source in `src` and tests in `tests`.
- A command-line tool is another project under `backend/src`, not a second root.

## Backend

- Use Clean Architecture. Dependencies point inward. `Domain` references nothing.
- Keep controllers thin: bind, dispatch through MediatR, return. No logic in a
  controller.
- Commands, queries, handlers, and validators live in `Application`.
- One file per type. Every class, interface, record, and enum gets its own file,
  named for the type it holds.
- Folders and namespaces agree. Controllers live in a `Controllers` folder and are
  namespaced `Goodwork.Api.Controllers`.
- Business rules live in Application handlers and domain services, never in
  endpoints or controllers.
- The API does **not** apply EF Core migrations on startup. Run them explicitly.
- Seed data is idempotent and safe to re-run.
- Endpoints require authentication by default. Anonymous access must be opted
  into explicitly per endpoint.
- Every query, search result and endpoint enforces permissions on the server.
  Never rely on the UI to hide data.
- Keep request logging outside the exception-handling middleware so handled
  response statuses are logged correctly.
- Keep secrets out of the repo; use configuration and environment variables.

## Frontend

- `frontend/` is an Angular workspace: the `api`, `components`, and `domain`
  libraries and the application project are siblings under `frontend/projects/`.
- The design system lives in `docs/design-system/`. Its `tokens/tokens.css` is
  authoritative; `npm run sync:tokens` copies it into the `components` library.
- Prefer signals over RxJS, and hold state in signals. Reach for RxJS only for
  genuine streams and events.
- No single-file components. Template, styles, and class each live in their own file.
- Prettier owns formatting and angular-eslint owns lint; CI fails on either.
- WCAG 2.2 AA on every screen: keyboard reachable, visible focus, labelled
  controls, sufficient contrast.
- Keep component styles encapsulated; global styles are limited to shared
  foundations and utilities.
- Declare each `ng-content` slot once. A component that renders `<a>` or
  `<button>` conditionally puts its slots in one `<ng-template>` and renders it
  with `ngTemplateOutlet` in both branches.
- No inline forms in pages. Button-triggered editing opens an Angular CDK Dialog
  or navigates to a screen.
- Use Angular CDK Dialog/Overlay for modal behavior; never hand-roll modals.

### Components library is mandatory (CRITICAL)

Every UI component defined in the design system MUST be built once in
`frontend/projects/components/` and reused everywhere.

- Compose every screen from `components`. Do NOT build, copy, restyle or wrap a
  design-system component anywhere else.
- If a screen needs a component `components` does not have, add it there first,
  matching the design system, then use it. Never create a one-off local version.
- If a component is missing a variant or state the design system defines, extend
  it in `components`. Do not override its styles from a consumer.
- Components MUST meet WCAG 2.2 AA, read tokens by role and expose the design
  system's variants, sizes and states through inputs.
- A screen that uses a hand-rolled substitute for a library component is
  incomplete and MUST be corrected before it is considered done.

### Where a component belongs

Placement follows what a component knows, and it is not negotiable.

- `components`: presentational only - buttons, cards, pills. Takes an input, emits
  an output, injects no application service, imports no other project. An Angular
  primitive like `Router` is fine; an `api` contract is not. That leaf position is
  what lets the library publish to npm.
- `domain`: components that inject an `api` contract through its token and render
  what it returns.
- The application project: routed page components, composing the other two and
  owning routing, guards, and dialogs.
- Dependencies run one way, application to `domain` to `api`. A presentational
  component that turns out to need a service moves to `domain`.

### Interface-driven service consumption - mandatory on the frontend

Every service an application consumes is reached through an interface and an
`InjectionToken`. No component, store, or feature imports a concrete implementation.

- `IQuoteService` declares the contract and `QUOTE_SERVICE` is its `InjectionToken`;
  the interface, the token, and each implementation live in separate files.
- Contracts are named `I<Entity>Service`, singular, with no `Api` suffix. Data
  shapes (`QuoteResult`) take no prefix, and the production implementation takes
  the unprefixed name (`QuoteService`), never an `Impl` suffix.
- Consumers call `inject(QUOTE_SERVICE)` only. Composition binds the token to the
  HTTP adapter in production and to a mock under Playwright, so a test never
  reaches the real implementation.
- HTTP calls and observable-to-signal conversion stay inside the `api`
  implementations; `domain` types carry no HTTP dependency.

## Testing Approach

Use acceptance test-driven development (ATDD): begin with a failing acceptance
test, link it to explicit criteria written using the Given-When-Then format,
implement until it passes, and keep criteria, tests, and implementation aligned.

Back end: integration tests against the API. Front end: Playwright, using the
Page Object Model - one page object per screen, owning the selectors and the
interactions. Tests state intent; page objects know the DOM. Never put a
selector in a test.

Backend tests MUST use a fake database: the EF Core in-memory provider, with a
uniquely named database per test fixture. Tests MUST NOT depend on Docker,
Testcontainers, a running database or any other external service; fake external
dependencies (storage, email, time) behind their abstractions.

### Incremental implementation (MANDATORY)

Mocks and the design system are design artifacts; do not write tests for them.

Every new feature or change to production behavior MUST have a requirement
(`docs/specs/`), a detailed design (`docs/detailed-designs/`) and a mock
(`docs/mocks/`) before implementation begins, and MUST invoke and follow the
`implementing-incrementally` skill before any code is written:

1. Plan small, reviewable slices and complete one at a time.
2. For each slice, write Given-When-Then criteria, write the acceptance test, and
   run it to prove it fails for the expected reason BEFORE writing production code.
3. Implement only what satisfies that slice, refactor with tests green, and run
   the relevant regression checks.
4. Do not move to the next slice until those checks pass.

No bulk implementation, no tests added afterward, and no weakening tests to
manufacture a pass.

### Playwright

- Run in Chromium only. Do not configure or run any other browser.
- Run axe accessibility checks on every screen.
- **The full suite MUST pass with no backend running** - no API, database,
  identity server or Docker. Every HTTP call is intercepted with `page.route` /
  `context.route` and answered by a fake API in `e2e/fixtures/` that owns an
  in-memory data set, seeded per test, and honours the real contracts (status
  codes, shapes, validation and permission failures).
- Authentication is faked too: the fake answers the OIDC requests so the app runs
  its real sign-in flow. Tests sign in through a fixture, never by editing storage.
- Fake behavior lives in `e2e/fixtures/`, never in page objects or specs.
- A request the fake does not recognise MUST fail the test loudly. Never let a
  request fall through to a real network.
- Playwright's `webServer` starts only the Angular app.
- Keep the fake in step with the API: when an endpoint, DTO or permission rule
  changes, update the fake in the same change.

### Never write architecture tests

Never add a test that asserts the shape of the codebase rather than its behavior:
no structure, layout, or naming tests; no banned-API scans; no traceability tests
that parse the specifications. Those constraints belong to the compiler, the
formatter, and review. A test suite exists to prove behavior.

## Folder Structure (MANDATORY)

- Every file MUST go in the folder this tree assigns it. If no folder fits, stop
  and ask; do not guess or improvise.
- Do NOT create top-level folders, projects, libraries or alternative layouts
  that are not in this tree, and do NOT move, rename or merge those in it.
- The tree changes only with the user's explicit approval, and this section MUST
  be updated in the same change.
- Work that does not follow this structure is incomplete.

```text
goodwork/
|-- README.md, AGENTS.md, CLAUDE.md, GEMINI.md   # Overview and agent instructions
|-- Dockerfile, .dockerignore, .gitignore
|-- .github/
|   `-- copilot-instructions.md                  # Pointer to AGENTS.md
|-- backend/                                     # .NET solution
|   |-- Goodwork.sln, Directory.Build.props, Directory.Packages.props, global.json
|   |-- src/
|   |   |-- Goodwork.Domain/                     # Entities. References nothing.
|   |   |-- Goodwork.Application/                # Commands, queries, handlers, validators, abstractions
|   |   |-- Goodwork.Infrastructure/             # EF Core context and migrations, SMTP, options
|   |   |-- Goodwork.Api/                        # Controllers, middleware, workers, Program.cs
|   |   `-- Goodwork.Cli/                        # Database migrate command
|   `-- tests/
|       `-- Goodwork.Api.Tests/                  # Integration tests against the API
|-- frontend/                                    # Angular workspace
|   `-- projects/
|       |-- goodwork/                            # The application: shell, routed pages
|       |-- api/                                 # Service contracts, tokens and HTTP implementations
|       |-- components/                          # Presentational design-system components and tokens
|       `-- domain/                              # Components that inject an api contract
|-- e2e/                                         # Playwright suite (Chromium only)
|   |-- fixtures/                                # Fake backend, test fixtures, static server for the build
|   |-- page-objects/                            # One page object per screen
|   `-- specs/                                   # Specs, including axe accessibility checks
`-- docs/
    |-- specs/                                   # L1 and L2 requirements
    |-- detailed-designs/                        # Per-subsystem and feature designs and diagrams
    |-- mocks/                                   # Static HTML mocks: the design reference
    |-- design-system/                           # Tokens, components and patterns taken from the mocks
    `-- estimates/                               # Effort and percent complete per design
```
