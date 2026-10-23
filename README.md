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
|   |-- src/              # API, Application, Domain, Infrastructure
|   `-- tests/            # API integration tests
|-- frontend/
|   `-- projects/
|       |-- goodwork/     # Angular application
|       |-- api/          # Service contracts' HTTP implementations
|       |-- components/   # Design-system component library
|       `-- domain/       # Service-aware components
|-- design-system/        # Design tokens and component guidance
|-- e2e/
|   |-- fixtures/         # Fake API and fake OIDC
|   |-- page-objects/     # One page object per screen
|   `-- specs/            # Playwright acceptance tests
`-- docs/
    |-- specs/            # L1 and L2 requirements
    |-- detailed-designs/ # Detailed designs
    `-- mocks/            # Static HTML mocks
```

## Getting started

### Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) (current LTS)
- [Node.js](https://nodejs.org/) (current LTS) and npm
- A SQL database for local development (connection string via configuration)

### Clone

```bash
git clone <repository-url> goodwork
cd goodwork
```

### Configure

Secrets never live in the repository. Supply them through
[user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) or
environment variables:

```bash
cd backend/src/Goodwork.Api
dotnet user-secrets set "ConnectionStrings:Goodwork" "<connection-string>"
```

### Run the API

Migrations are not applied on startup; run them explicitly first.

```bash
cd backend
dotnet ef database update --project src/Goodwork.Infrastructure --startup-project src/Goodwork.Api
dotnet run --project src/Goodwork.Api
```

### Run the web client

```bash
cd frontend
npm install
npm start
```

Open <http://localhost:4200>.

## Running tests

```bash
# Backend integration tests (no database or Docker required)
cd backend && dotnet test

# Frontend lint and format checks
cd frontend && npm run lint && npx prettier --check .

# End-to-end acceptance tests (no backend required; the API is faked)
cd e2e && npm install && npx playwright install chromium && npx playwright test
```

Development follows acceptance test-driven development: every change starts
with Given-When-Then criteria and a failing acceptance test. See
[CONTRIBUTING.md](CONTRIBUTING.md).

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
