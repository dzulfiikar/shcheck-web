# shcheck-web

A modern web-based security header scanning tool with real-time monitoring, CSP evaluation, and scan comparison capabilities. Built with React, ElysiaJS, and BullMQ.

## Purpose

This project provides a user-friendly web interface for security header analysis, making it easier for developers and security enthusiasts to:
- Audit their web applications' security configurations
- Track security improvements over time through scan comparisons
- Learn about security headers and CSP best practices
- Generate reports for internal security reviews

**Intended Use**: This tool is designed for **personal and internal testing only**. Use it to scan websites you own or have explicit permission to test.

## ⚠️ Disclaimer

**Vibe Coded Project**: This project was created through rapid iterative development ("vibecoded") with assistance from AI tools. While functional, it may contain bugs, incomplete features, or security considerations typical of prototype-level software.

**No Liability**: The authors and contributors assume **no liability** for any damages, legal issues, or consequences arising from the use of this tool. This includes but is not limited to:
- Unauthorized scanning of systems you do not own
- Misinterpretation of scan results
- Security breaches or data loss
- Any direct, indirect, incidental, or consequential damages

By using this software, you acknowledge that you understand these risks and agree to use it solely at your own risk and responsibility. Always obtain proper authorization before scanning any target.

## Features

- **Security Header Scanning**: Scan any URL for security headers using the powerful shcheck engine
- **cURL Support**: Paste cURL commands to automatically extract URLs, headers, cookies, and method
- **Bulk Scanning**: Scan multiple URLs at once by entering them separated by newlines
- **Real-time Updates**: Live scan progress with Server-Sent Events (SSE) notifications
- **CSP Evaluation**: Detailed Content-Security-Policy analysis based on CSP Level 3 standards
- **Scan History**: Persistent storage of all scans with search and filtering
- **Scan Comparison**: Side-by-side comparison of two scans to track improvements
- **PDF Reports**: Download professional PDF reports for individual or bulk scans
- **Quick Actions**: New Scan and Rescan buttons on detail page for quick workflow
- **Bulk Operations**: Select and delete multiple scans at once, or scan multiple URLs
- **Responsive UI**: Modern interface built with shadcn/ui and Tailwind CSS

## Architecture

- **Frontend**: React 18 + Vite + TanStack Router/Query + Tailwind CSS + shadcn/ui
- **Backend**: ElysiaJS + Drizzle ORM + BullMQ
- **Database**: PostgreSQL 16
- **Queue**: Redis 7 + BullMQ for async scan processing
- **Runtime**: Bun
- **Security Engine**: [shcheck](https://github.com/santoru/shcheck) by santoru (downloaded fresh from GitHub master on build)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Make (optional, for convenience commands)

### Scanning Local Services

When running with Docker, use `host.docker.internal` instead of `localhost` to scan services running on your host machine:

```
# Instead of: http://localhost:9090
# Use:        http://host.docker.internal:9090
```

This works for local development servers, APIs, or any service running on your device.

### Development

```bash
# Start all services
cd shcheck-web
make dev

# Or without make
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/swagger
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Common Commands

```bash
# Development
make dev              # Start development environment
make dev-detached     # Start in background
make stop             # Stop all services
make clean            # Stop and remove volumes

# Database
make db-push          # Push schema changes
make db-studio        # Open Drizzle Studio
make migrate          # Run migrations

# Testing
make test             # Run all tests
make test-backend     # Run backend tests only
make test-frontend    # Run frontend tests only
make test-e2e         # Run E2E tests

# Utilities
make logs             # View all logs
make logs-backend     # View backend logs
make logs-frontend    # View frontend logs
make shell-backend    # Access backend shell
make shell-frontend   # Access frontend shell
```

## Testing

The project has a comprehensive test suite with three layers:

### Test Structure

| Layer | Framework | Location | Purpose |
|-------|-----------|----------|---------|
| **Backend Unit** | Bun Test | `backend/tests/unit/` | Service logic, utilities |
| **Backend Integration** | Bun Test | `backend/tests/integration/` | API endpoints, database |
| **Frontend Unit** | Vitest | `frontend/src/**/__tests__/` | Components, hooks, utilities |
| **E2E** | Playwright | `e2e/tests/` | Full user workflows |

### Running Tests

```bash
# Run all tests
make test

# Backend tests only
cd backend && bun test

# Frontend tests only
cd frontend && npm run test

# E2E tests
cd e2e && npm run test

# Watch mode (frontend)
cd frontend && npm run test:ui
```

### Test Coverage

- **Backend**: 65+ tests covering services, routes, and integration
- **Frontend**: 139+ tests for components, hooks, and utilities
- **E2E**: Full scan lifecycle, PDF downloads, comparison workflows, bulk scan, cURL parsing

## Project Structure

```
shcheck-web/
├── docker-compose.yml          # Main orchestration
├── docker-compose.test.yml     # Test environment
├── docker-compose.prod.yml     # Production configuration
├── Makefile                    # Common commands
│
├── frontend/                   # React + TanStack + shadcn
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── csp/           # CSP evaluation components
│   │   │   ├── compare/       # Scan comparison components
│   │   │   └── scan/          # Scan-related components
│   │   ├── routes/            # TanStack Router routes
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── use-create-scan.ts
│   │   │   ├── use-create-bulk-scans.ts  # Bulk scan creation
│   │   │   ├── use-download-scan-pdf.ts
│   │   │   ├── use-bulk-download-pdf.ts
│   │   │   └── __tests__/     # Hook unit tests (Vitest)
│   │   ├── lib/               # Utilities and API client
│   │   │   ├── api.ts
│   │   │   ├── curl-parser.ts # cURL command parser
│   │   │   ├── formatters.ts
│   │   │   └── __tests__/     # Utility tests
│   │   └── types/             # TypeScript types
│   └── ...
│
├── backend/                    # ElysiaJS + BullMQ + Drizzle
│   ├── src/
│   │   ├── db/                # Database schema & migrations
│   │   ├── routes/            # API routes
│   │   │   └── scans.routes.ts           # Includes POST /api/scans/bulk
│   │   ├── services/          # Business logic
│   │   │   ├── csp-evaluator.service.ts  # CSP Level 3 evaluation
│   │   │   ├── pdf.service.ts            # PDF report generation
│   │   │   └── shcheck.service.ts        # Security scanning
│   │   ├── queue/             # BullMQ queue configuration
│   │   └── types/             # TypeScript types
│   └── tests/                 # Backend tests (Bun test)
│       ├── unit/              # Unit tests
│       │   ├── bulk-scan.service.test.ts
│       │   ├── pdf.service.test.ts
│       │   └── shcheck.service.test.ts
│       └── integration/       # Integration tests
│
└── e2e/                        # Full stack E2E tests (Playwright)
    └── tests/
        ├── bulk-scan.spec.ts     # Bulk scanning workflow
        ├── curl-scan.spec.ts     # cURL command parsing
        ├── pdf-download.spec.ts
        ├── scans.spec.ts
        └── smoke.spec.ts
```

## API Endpoints

- `POST /api/scans` - Create a new scan job
- `POST /api/scans/bulk` - Create multiple scan jobs from newline-separated URLs
- `GET /api/scans` - List scans (paginated, with search)
- `GET /api/scans/:id` - Get scan details
- `DELETE /api/scans/:id` - Delete a scan
- `POST /api/scans/bulk-delete` - Delete multiple scans
- `GET /api/scans/:id/subscribe` - SSE endpoint for live updates
- `GET /api/scans/:id/pdf` - Download scan report as PDF
- `POST /api/scans/bulk-pdf` - Download bulk scan reports as PDF
- `GET /api/health` - Health check

## CSP Evaluation

The application includes a comprehensive CSP evaluator that analyzes Content-Security-Policy headers against CSP Level 3 standards. The CSP evaluation is performed automatically when a `Content-Security-Policy` or `Content-Security-Policy-Report-Only` header is detected in the scan results.

- **Security Score**: 0-100 rating based on policy configuration
- **Effectiveness Rating**: Classified as `none`, `weak`, `moderate`, or `strong`
- **Directive Analysis**: Evaluation of each CSP directive
- **Bypass Detection**: Identifies potential CSP bypass techniques
- **Framework Compatibility**: Detects compatibility with React, Angular, Vue.js
- **Recommendations**: Actionable suggestions for improving CSP

## PDF Reports

Generate professionally designed PDF reports that match the web UI styling:

- **Individual Reports**: Download a detailed report for any completed scan via `GET /api/scans/:id/pdf`
- **Bulk Reports**: Export multiple scans as a combined PDF via `POST /api/scans/bulk-pdf`
- **Professional Design**: Card-based layout with color-coded badges, progress bars, and stat cards matching the shadcn/ui interface
- **Sections**: Summary statistics, CSP evaluation with score visualization, present/missing headers with badges, information disclosure, caching headers
- **Visual Elements**: Shield logo in header, rounded cards, alternating row backgrounds, status badges
- **Dynamic Layout**: Text wrapping for long header values with automatic row height calculation
- **Typography**: Consistent font hierarchy using design system constants

PDF generation is handled by `backend/src/services/pdf.service.ts` using PDFKit with a design system matching the Tailwind color palette. Key features include centered badge text, dynamic text wrapping, and consistent spacing throughout.

## Credits

This project is built upon the excellent work of:

- **[shcheck](https://github.com/santoru/shcheck)** by [santoru](https://github.com/santoru) - The core security header scanning engine
- **[Dzulfikar](https://github.com/dzulfiikar)** - Project development and architecture
- **Kimi K2.5** - Implementation assistance and code generation

## Troubleshooting

### Scanning localhost / Local Services

When running with Docker, the backend container cannot access services using `localhost` because it refers to the container itself, not your host machine.

**Solution:** Use `host.docker.internal` instead of `localhost`:

```
# ❌ Won't work (refers to container localhost)
http://localhost:9090

# ✅ Works (refers to host machine)
http://host.docker.internal:9090
```

**Platform Support:**
- **Docker Desktop (Mac/Windows)**: Works out of the box
- **Linux**: Works with the `extra_hosts` configuration in docker-compose.yml

**Alternative (Linux only):** Use host network mode by uncommenting `network_mode: host` in docker-compose.yml.

### Build Issues

```bash
# Reset everything
make clean && make dev

# Reinstall dependencies
rm -rf frontend/node_modules backend/node_modules
make dev
```

### Database Issues

```bash
# Reset database
make clean
make dev
make db-push
```

### Queue Issues

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping

# Clear stuck jobs
docker-compose restart backend
```

## License

MIT
