<p align="center"><img src="docs/detailed-designs/logo.svg" alt="Goodwork" width="96" height="96"></p>

# Goodwork

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-API-512BD4.svg)](backend/)
[![Angular](https://img.shields.io/badge/Angular-web-DD0031.svg)](frontend/)
[![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-success.svg)](docs/specs/L1.md)

Goodwork is a small software studio that builds websites and custom applications
for non-profits, churches and ministries, and companies whose work makes life
better for someone. This repository holds the studio's public site: a responsive
brochure home page with a secure contact form, backed by a .NET API and an
Angular web client.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Running tests](#running-tests)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Features

- **Brochure home page** - who Goodwork is, why it costs less than an agency,
  and the services it offers: web and mobile apps, and websites.
- **Contact request** - visitors send a project enquiry with an email address
  and a short message, and are told clearly whether it was sent, what is wrong,
  or how to reach Goodwork another way.
- **Request delivery** - every accepted request is stored durably and delivered
  to Goodwork's inbox for a reply within two business days.
- **Security and abuse protection** - server-side validation, rate limiting and
  spam protection, and data protected in transit and at rest.
- **Responsive and themed** - works from extra-small to extra-large viewports,
  in light and dark themes.
- **Accessible** - meets WCAG 2.2 AA.
- **Fast** - quick to load on mobile connections, with a prompt contact endpoint.

The full requirements are in [docs/specs/L1.md](docs/specs/L1.md) and
[docs/specs/L2.md](docs/specs/L2.md).

## Architecture

| Layer    | Technology                                                        |
| -------- | ----------------------------------------------------------------- |
| API      | .NET, Clean Architecture, MediatR 12.5.0, EF Core                 |
| Web      | Angular (signals), Angular CDK                                    |
| Testing  | API integration tests (EF Core in-memory), Playwright (Chromium)  |
| Quality  | Prettier, angular-eslint, axe accessibility checks                |

The backend follows Clean Architecture with vertical feature slices: thin
controllers dispatch through MediatR to handlers in `Application`, and `Domain`
references nothing. The frontend is an Angular workspace of three libraries and
one application - `components` (presentational, design-system components),
`domain` (components that consume services through `InjectionToken` contracts),
`api` (HTTP implementations) and `goodwork` (routed pages).

## Repository layout

```text
goodwork/
|-- backend/
|   |-- src/              # Api, Application, Domain, Infrastructure, Cli
|   `-- tests/            # API integration tests
|-- frontend/
|   `-- projects/
|       |-- goodwork/     # Angular application
|       |-- api/          # Service contracts, tokens and HTTP implementations
|       |-- components/   # Design-system component library
|       `-- domain/       # Service-aware components
|-- e2e/
|   |-- fixtures/         # Fake API and the static server for the built app
|   |-- page-objects/     # One page object per screen
|   `-- specs/            # Playwright acceptance tests
|-- Dockerfile            # Builds the Angular app into the API image
`-- docs/
    |-- specs/            # L1 and L2 requirements
    |-- detailed-designs/ # Detailed designs
    |-- mocks/            # Static HTML mocks
    |-- design-system/    # Design tokens and component guidance
    `-- estimates/        # Effort and percent complete
```

## Getting started

### Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) 10
- [Node.js](https://nodejs.org/) 24 and npm

Local development uses SQLite, so there is no database server to install.

### Clone

```bash
git clone <repository-url> goodwork
cd goodwork
```

### Configure

Secrets never live in the repository. Supply them through
[user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) or
environment variables (use `__` for nesting, for example `Smtp__Host`).

| Setting | Purpose |
| --- | --- |
| `ConnectionStrings__Goodwork` | SQLite connection string, default `Data Source=goodwork.db` |
| `StudioInbox__InboxAddress`, `StudioInbox__FromAddress` | Where contact requests are emailed, and the sender |
| `Smtp__Host`, `Smtp__Port`, `Smtp__UseStartTls`, `Smtp__Username`, `Smtp__Password` | Mail server |
| `Smtp__PickupDirectory` | Write emails to this folder instead of sending them (Development sets `outbox`) |
| `ForwardedHeaders__Enabled` | `true` (the default) behind a reverse proxy, so the real client address and scheme are used. Set `false` if the API is exposed directly. |
| `HttpsRedirection__Port` | Public HTTPS port used by the HTTP-to-HTTPS redirect, default 443 |
| `AllowedOrigins` | Extra origins allowed to post; normally empty |
| `Workers__Enabled` | `false` switches off the delivery and retention jobs |

The studio location and contact email shown on the page (`Toronto, Ontario`,
`hello@goodwork.rocks`) are confirmed. They live in
`frontend/projects/goodwork/src/app/studio.ts`.

### Run the API

Migrations are not applied on startup; run them explicitly with the CLI first.

```bash
cd backend
dotnet run --project src/Goodwork.Cli -- migrate
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:5080 \
  dotnet run --project src/Goodwork.Api --no-launch-profile
```

### Run the web client

```bash
cd frontend
npm install
npm start
```

Open <http://localhost:4200>. The dev server proxies `/api` to the API on port 5080.

## Running tests

```bash
# Backend integration tests (no database or Docker required)
cd backend && dotnet test

# Frontend lint and format checks
cd frontend && npm run lint && npm run format:check && npm run build

# End-to-end acceptance tests (no backend required; the API is faked)
cd e2e && npm install && npx playwright install chromium && npx playwright test
```

Development follows acceptance test-driven development: every change starts
with Given-When-Then criteria and a failing acceptance test. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Build and run in a container

```bash
docker build -t goodwork .
docker run --rm -v goodwork-data:/data goodwork dotnet /app/cli/Goodwork.Cli.dll migrate
docker run -p 8080:8080 -v goodwork-data:/data \
  -e StudioInbox__InboxAddress=studio@example.org -e StudioInbox__FromAddress=no-reply@example.org \
  -e Smtp__Host=smtp.example.org goodwork
```

Put a TLS-terminating reverse proxy in front: the app redirects HTTP to HTTPS and sends HSTS.

## Deployment

Production is <https://goodwork.rocks>, an Azure Container App (consumption
plan, scale-to-zero, one replica) in the `rg-goodwork-prod` resource group with
the SQLite database on an Azure Files share mounted at `/data`.

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
tests, then build the image and push it to `ghcr.io/quinntynebrown/goodwork`,
run the migration as the `caj-goodwork-migrate` Container Apps job, and update
the `ca-goodwork-prod` container app. GitHub signs in to Azure through OpenID
Connect with the `id-goodwork-github` managed identity; no Azure credentials are
stored in the repository.

Runtime settings (mail server, studio inbox) are environment variables and
secrets on the container app, never in the repository. The delivery and
retention workers are off (`Workers__Enabled=false`) until SMTP is configured.

## Documentation

- [Requirements](docs/specs/) - L1 high-level and L2 detailed requirements
- [Detailed designs](docs/detailed-designs/) - design per feature
- [Mocks](docs/mocks/) - static HTML mocks of every screen and state
- [Design system](docs/design-system/) - tokens, foundations and components
- [AGENTS.md](AGENTS.md) - conventions for contributors and coding agents

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and
the [Code of Conduct](CODE_OF_CONDUCT.md) before opening an issue or pull request.

## Security

Please do not report security vulnerabilities through public issues. See
[SECURITY.md](SECURITY.md).

## Support

See [SUPPORT.md](SUPPORT.md).

## License

Licensed under the [MIT License](LICENSE).
