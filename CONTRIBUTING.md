# Contributing to Goodwork

Thank you for your interest in contributing. This guide explains how to propose
changes and what a pull request needs before it can merge.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting issues

- Search existing issues before opening a new one.
- For bugs, include steps to reproduce, expected and actual behavior, and your
  browser, OS and versions.
- For security issues, follow [SECURITY.md](SECURITY.md) instead.

## Workflow

1. Fork the repository and create a branch from `main`
   (`feature/<short-name>` or `fix/<short-name>`).
2. Make sure the change has a requirement in `docs/specs/`, a detailed design in
   `docs/detailed-designs/` and a mock in `docs/mocks/`.
3. Implement in small slices using acceptance test-driven development:
   - write Given-When-Then criteria;
   - write the acceptance test and watch it fail for the expected reason;
   - implement the least code that makes it pass, then refactor with tests green.
4. Run the full checks (below) and open a pull request.

## Conventions

The full conventions are in [AGENTS.md](AGENTS.md). Highlights:

- **Backend**: Clean Architecture, vertical slices, thin controllers dispatching
  through MediatR (pinned to 12.5.0 - do not upgrade), one type per file.
- **Frontend**: signals over RxJS, no single-file components, every
  design-system component built once in `frontend/projects/components/`, and
  services consumed through interfaces and `InjectionToken`s.
- **Accessibility**: every screen meets WCAG 2.2 AA.
- **Folder structure**: files go where the tree in AGENTS.md assigns them.
- **Secrets**: never commit them; use configuration and environment variables.

## Checks

```bash
cd backend && dotnet test
cd frontend && npm run lint && npx prettier --check .
cd e2e && npx playwright test
```

Backend tests use the EF Core in-memory provider; Playwright runs in Chromium
against a fake API. Neither needs a database, Docker or a running backend.

## Pull requests

- Keep each pull request focused and reviewable.
- Reference the requirement IDs (for example `L2-002.1`) the change satisfies.
- Describe what changed and how it was verified.
- CI must pass, and at least one maintainer must approve.

## Commit messages

Use the imperative mood and keep the subject under 72 characters, for example
`Add rate limiting to contact endpoint`.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
