# AGENTS.md - AI Coding Assistant Guide

## Project Overview

**shcheck-web** is a full-stack web application for security header scanning. It provides a modern web interface for the [shcheck](https://github.com/santoru/shcheck) Python tool, with features like real-time scan monitoring, CSP evaluation, scan comparison, and persistent history.

### Core Purpose
- Scan URLs for security headers
- Paste cURL commands to extract scan parameters (URL, headers, cookies, method)
- Bulk scan multiple URLs separated by newlines
- Evaluate Content-Security-Policy headers against CSP Level 3 standards
- Compare scans over time
- Maintain scan history with search and bulk operations
- Quick actions (New Scan, Rescan) from any scan detail page

---

## Architecture

### High-Level Stack

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Frontend      │────▶│    Backend      │────▶│   Redis     │
│  React + Vite   │     │  ElysiaJS       │     │   BullMQ    │
│  TanStack       │◄────│  Bun Runtime    │◄────│   Queue     │
└─────────────────┘     └────────┬────────┘     └─────────────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │  PostgreSQL │
                          │  Drizzle ORM│
                          └─────────────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │   shcheck   │
                          │   Python    │
                          └─────────────┘
```

### Technology Details

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Frontend | Vite | Build tool & dev server |
| Frontend | TanStack Router | Type-safe routing |
| Frontend | TanStack Query | Server state management |
| Frontend | Tailwind CSS | Styling |
| Frontend | shadcn/ui | Component library |
| Backend | ElysiaJS | Web framework (Eden Treaty) |
| Backend | Drizzle ORM | Database ORM |
| Backend | BullMQ | Job queue |
| Backend | Bun | Runtime |
| Database | PostgreSQL 16 | Data persistence |
| Queue | Redis 7 | BullMQ backing |
| Scanner | Python shcheck | Security header scanning |

---

## Directory Structure

```
shcheck-web/
├── AGENTS.md                   # This file
├── README.md                   # Project documentation
├── Makefile                    # Common commands
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production environment
├── docker-compose.test.yml     # Test environment
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── csp/           # CSP evaluation components
│   │   │   ├── compare/       # Scan comparison
│   │   │   ├── scan/          # Scan-related components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── routes/            # TanStack Router routes
│   │   │   ├── __root.tsx     # Root layout with nav/footer
│   │   │   ├── about.tsx      # About/credits page
│   │   │   ├── compare.tsx    # Scan comparison page
│   │   │   ├── index.tsx      # Home/new scan page
│   │   │   └── scans/         # Scan routes
│   │   │       ├── index.tsx  # Scan list
│   │   │       └── $id.tsx    # Scan detail
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── use-scan.ts              # Single scan query
│   │   │   ├── use-scans.ts             # Scan list query
│   │   │   ├── use-scan-status.ts       # Polling status updates
│   │   │   ├── use-scan-subscription.ts # SSE for live updates
│   │   │   ├── use-create-scan.ts       # Single scan creation
│   │   │   ├── use-create-bulk-scans.ts # Bulk scan creation
│   │   │   ├── use-delete-scan.ts
│   │   │   ├── use-bulk-delete-scans.ts
│   │   │   ├── use-download-scan-pdf.ts # Single scan PDF download
│   │   │   └── use-bulk-download-pdf.ts # Bulk scan PDF download
│   │   ├── lib/               # Utilities
│   │   │   ├── api.ts         # API client (Eden)
│   │   │   ├── curl-parser.ts # cURL command parser
│   │   │   ├── formatters.ts  # Date/duration formatting
│   │   │   └── utils.ts       # General utilities
│   │   ├── types/             # TypeScript types
│   │   │   └── scan.ts        # Scan-related types
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                    # ElysiaJS backend
│   ├── src/
│   │   ├── db/                # Database
│   │   │   ├── index.ts       # Drizzle client
│   │   │   └── schema.ts      # Table definitions
│   │   ├── routes/            # API routes
│   │   │   ├── scans.routes.ts
│   │   │   └── health.routes.ts
│   │   ├── services/          # Business logic
│   │   │   ├── shcheck.service.ts       # Python execution
│   │   │   ├── csp-evaluator.service.ts # CSP analysis
│   │   │   └── pdf.service.ts           # PDF generation
│   │   ├── queue/             # BullMQ setup
│   │   │   ├── index.ts       # Queue config
│   │   │   ├── worker.ts      # Job processor
│   │   │   └── publisher.ts   # Redis pub/sub
│   │   ├── types/             # Type definitions
│   │   └── index.ts           # Elysia entry point
│   ├── tests/                 # Backend tests (Bun)
│   │   ├── unit/              # Unit tests
│   │   │   ├── pdf.service.test.ts
│   │   │   └── shcheck.service.test.ts
│   │   └── integration/       # Integration tests
│   │       └── scans.test.ts
│   ├── package.json
│   └── drizzle/               # Migrations
│
└── e2e/                        # Playwright E2E tests
    └── tests/
        ├── pdf-download.spec.ts
        ├── scans.spec.ts
        └── smoke.spec.ts
```

---

## Key Files for Agents

### Backend
- `backend/src/index.ts` - Elysia app setup, routes registration
- `backend/src/db/schema.ts` - Database schema & types
- `backend/src/services/shcheck.service.ts` - Python scan execution
- `backend/src/services/csp-evaluator.service.ts` - CSP Level 3 evaluation
- `backend/src/services/pdf.service.ts` - PDF report generation (PDFKit)
- `backend/src/queue/worker.ts` - BullMQ job processing
- `backend/src/routes/scans.routes.ts` - Scan API endpoints (includes /bulk)
- `backend/tests/unit/pdf.service.test.ts` - PDF service unit tests
- `backend/tests/unit/bulk-scan.service.test.ts` - Bulk scan unit tests
- `backend/tests/integration/scans.test.ts` - API integration tests

### Frontend
- `frontend/src/main.tsx` - React app entry
- `frontend/src/routes/__root.tsx` - Root layout (nav, footer)
- `frontend/src/lib/api.ts` - API client with Eden Treaty
- `frontend/src/lib/curl-parser.ts` - cURL command parser
- `frontend/src/types/scan.ts` - TypeScript type definitions
- `frontend/src/hooks/*.ts` - TanStack Query hooks
- `frontend/src/hooks/__tests__/*.test.tsx` - Hook unit tests (Vitest)
- `frontend/src/components/csp/CSPEvaluation.tsx` - CSP display
- `frontend/src/components/scan-form.tsx` - Scan form with cURL support

---

## Development Patterns

### API Layer (Backend)

```typescript
// Routes use Elysia with Eden Treaty
export const scansRoutes = new Elysia({ prefix: '/scans' })
  .post('/', async ({ body }) => {
    // Create scan job
    const job = await scanQueue.add({ ...body })
    return { jobId: job.id, status: 'pending' }
  })
  .get('/:id', async ({ params }) => {
    // Get scan by ID
    return await db.query.scans.findFirst(...)
  })
```

### PDF Generation (PDFKit)

```typescript
// PDF service pattern
class PDFService {
  private readonly colors = {
    success: '#22c55e',   // Match Tailwind green-500
    danger: '#ef4444',    // Match Tailwind red-500
    primary: '#0f172a',   // Match Tailwind slate-900
    // ...
  };

  private readonly spacing = {
    pageMargin: 40,
    sectionGap: 24,
    cardPadding: 16,
    elementGap: 12,
    smallGap: 8,
  };

  private readonly typography = {
    h2: { size: 16, font: 'Helvetica-Bold', lineHeight: 22 },
    body: { size: 10, font: 'Helvetica', lineHeight: 14 },
    badge: { size: 9, font: 'Helvetica-Bold', lineHeight: 12 },
    // ...
  };

  async generateScanReport(scan: ScanResponse): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    // Build PDF with cards, badges, progress bars
    // Match web UI styling (rounded corners, borders, colors)
  }

  // Helper for centered badge text
  private drawCenteredBadgeText(doc, text, x, y, width, height, fontSize, font, color): void {
    // Calculates vertical centering using font metrics (ascender/descender)
  }

  // Helper for calculating wrapped text height
  private calculateTextHeight(doc, text, width, fontSize, font, lineHeight): number {
    // Returns exact height needed for text wrapping
  }
}
```

Key design principles:
- **Colors**: Use Tailwind color palette (slate, green, red, yellow, blue)
- **Layout**: Card-based with rounded corners (8px radius), borders (slate-200)
- **Typography**: Clear hierarchy using design system constants (h2: 16px, body: 10px, badge: 9px)
- **Visual Elements**: Status badges (centered text), stat cards, progress bars, alternating row backgrounds
- **Pagination**: Automatic page breaks when content exceeds safe margins (>720px)
- **Dynamic Layout**: Row heights calculated based on actual text content to prevent overlap
- **Spacing**: Consistent 16px card padding, 24px section gaps, 12px element gaps

### Database (Drizzle)

```typescript
// Schema definition
export const scans = pgTable('scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  target: varchar('target', { length: 2048 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  result: jsonb('result').$type<ScanResult>(),
  // ...
})

// Queries
db.select().from(scans).where(eq(scans.id, id))
```

### Frontend Data Fetching (TanStack Query)

```typescript
// Hook pattern
export function useScan(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: async () => {
      const response = await api.api.scans({ id }).get()
      if (response.error) throw new Error(...)
      return response.data
    },
    refetchInterval: (query) => {
      // Poll while scan is active
      const status = query.state.data?.status
      return status === 'pending' || status === 'processing' ? 1000 : false
    }
  })
}
```

### Components (shadcn/ui)

```typescript
// Use shadcn components as base
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Style with Tailwind
<div className="p-4 max-w-7xl mx-auto">
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg">Title</CardTitle>
    </CardHeader>
  </Card>
</div>
```

---

## Type Safety

### Shared Types
Types are duplicated between backend and frontend for now:
- `backend/src/db/schema.ts` - Source of truth for DB types
- `frontend/src/types/scan.ts` - Frontend copy

Key types:
```typescript
interface ScanResult {
  url: string
  effectiveUrl: string
  present: Record<string, string>
  missing: string[]
  cspEvaluation?: CSPEvaluation  // Added post-scan
  summary: { safe: number; unsafe: number }
}

type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed'
```

### API Type Safety
Elysia with Eden Treaty provides end-to-end type safety:
```typescript
// Backend defines route
.post('/', ({ body }) => { ... }, {
  body: t.Object({ target: t.String() })
})

// Frontend gets typed client
const response = await api.api.scans.post({ target: 'https://...' })
// response.data is fully typed
```

---

## Common Tasks

### Adding a New API Endpoint
1. Add route in `backend/src/routes/scans.routes.ts`
2. Add service method if needed in `backend/src/services/`
3. Run `cd backend && npm run build` to check types
4. Frontend can use immediately (Eden Treaty types)

### Adding a Component
1. Check shadcn/ui first: `npx shadcn@latest add component-name`
2. If not available, build with shadcn primitives
3. Avoid Radix UI direct dependencies (use shadcn wrappers)
4. Place in `frontend/src/components/`
5. Export from `frontend/src/components/index.ts` if shared

### Database Changes
1. Modify `backend/src/db/schema.ts`
2. Run `make db-push` to apply changes
3. Update frontend types in `frontend/src/types/scan.ts`
4. Regenerate types if needed

### Adding a Hook
1. Create in `frontend/src/hooks/use-feature.ts`
2. Use TanStack Query for server state
3. Use React useState/useEffect for client state
4. Export from `frontend/src/hooks/index.ts`

### Adding Scan Detail Actions
The scan detail page (`frontend/src/routes/scans/$id.tsx`) has action buttons in the header:

```typescript
// New Scan button - navigates to home page
<Button asChild>
  <Link to="/">
    <Plus className="h-4 w-4 mr-2" />
    New Scan
  </Link>
</Button>

// Rescan button - creates new scan with same target
<Button onClick={handleRescan}>
  <RefreshCw className="h-4 w-4 mr-2" />
  Rescan
</Button>
```

To add new actions:
1. Add icon import from `lucide-react`
2. Add handler function in `ScanDetail` component
3. Add button in the header actions div (line ~342)
4. Use appropriate variant: `default`, `secondary`, or `outline`

### cURL Scanning

The scan form supports pasting cURL commands to automatically extract scan parameters:

**Parser Utility:** (`frontend/src/lib/curl-parser.ts`)
```typescript
import { parseCurlCommand, generateCurlCommand } from '@/lib/curl-parser';

// Parse a curl command
const parsed = parseCurlCommand('curl -X POST https://api.example.com -H "Authorization: Bearer token"');
// Returns: { url, method, headers, cookies, proxy, error? }

// Generate a curl command from parameters
const command = generateCurlCommand({
  url: 'https://example.com',
  method: 'POST',
  headers: { Authorization: 'Bearer token' }
});
```

**Supported curl options:**
- `-X, --request` - HTTP method
- `-H, --header` - Custom headers
- `-b, --cookie` - Cookies
- `-x, --proxy` - Proxy URL
- `-I, --head` - HEAD request
- `--data, --data-raw, --data-binary, -d` - POST data (implies POST method)
- `-L, --location` - Follow redirects (acknowledged)
- Line continuation with `\`

**Implementation in ScanForm:**
- Toggle between URL and cURL input modes
- Real-time parsing with visual feedback
- Extracted headers shown in Advanced Options
- Custom headers passed to scan via `headers` field

### Bulk Scanning

The bulk scan feature allows users to scan multiple URLs at once. Located on the scan list page (`frontend/src/routes/scans/index.tsx`):

**Backend Endpoint:**
```typescript
// POST /api/scans/bulk
// Accepts newline-separated URLs
const response = await api.api.scans.bulk.post({
  targets: 'https://example.com\nhttps://test.com\nhttps://demo.com'
});
// Returns: { jobs: [{ jobId, status }], total, created, errors? }
```

**Frontend Implementation:**
```typescript
// Hook usage
const createBulkScans = useCreateBulkScans();

createBulkScans.mutate(
  { targets: urlsTextarea },
  {
    onSuccess: (response) => {
      console.log(`Created ${response.created} of ${response.total} scans`);
    },
  }
);
```

**Key files:**
- `backend/src/routes/scans.routes.ts` - Bulk scan endpoint
- `frontend/src/hooks/use-create-bulk-scans.ts` - TanStack Query hook
- `frontend/src/types/scan.ts` - `BulkCreateScanRequest`, `BulkCreateScanResponse` types

### Modifying PDF Reports
1. Edit `backend/src/services/pdf.service.ts`
2. Update design system constants:
   - `colors` - Tailwind color palette
   - `spacing` - pageMargin (40), sectionGap (24), cardPadding (16), elementGap (12)
   - `typography` - font sizes, fonts, line heights for each text style
3. Use helper methods:
   - `drawCard()` - Rounded card container with border
   - `drawStatCard()` - Statistics card with value and label
   - `drawShieldIcon()` - Shield logo for header
   - `drawCenteredBadgeText()` - Vertically centered text in badges
   - `calculateTextHeight()` - Calculate wrapped text height for dynamic rows
4. Ensure page breaks with `if (yPos > 720) { doc.addPage(); yPos = 50; }`
5. Calculate dynamic row heights using `heightOfString()` to prevent text overlap
6. Test PDF generation with both single and bulk reports
7. Build backend: `make build-backend` (or `cd backend && bun run build` in Docker)

### Adding Tests

#### Backend Tests (Bun Test)
```typescript
// Unit test in backend/tests/unit/service.test.ts
describe('Service', () => {
  it('should do something', async () => {
    const result = await service.method();
    expect(result).toBe(expected);
  });
});
```

#### Frontend Tests (Vitest)
```typescript
// Hook test in frontend/src/hooks/__tests__/use-hook.test.tsx
describe('useHook', () => {
  it('should fetch data', async () => {
    const { result } = renderHook(() => useHook(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

#### E2E Tests (Playwright)
```typescript
// E2E test in e2e/tests/feature.spec.ts
test('should complete workflow', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('button').click();
  await expect(page.getByText('Success')).toBeVisible();
});
```

---

## Testing

### Test Structure

| Layer | Framework | Location | Pattern |
|-------|-----------|----------|---------|
| **Backend Unit** | Bun Test | `backend/tests/unit/` | `*.test.ts` |
| **Backend Integration** | Bun Test | `backend/tests/integration/` | `*.test.ts` |
| **Frontend Unit** | Vitest | `frontend/src/**/__tests__/` | `*.test.tsx` |
| **E2E** | Playwright | `e2e/tests/` | `*.spec.ts` |

### Backend
```bash
cd backend
bun test              # Run all tests
bun test --watch      # Watch mode
```

### Frontend
```bash
cd frontend
npm run test          # Vitest
npm run test:ui       # Vitest UI
```

### E2E
```bash
docker-compose -f docker-compose.test.yml up
# Or: make test-e2e
```

---

## Docker Commands

```bash
# Development
make dev              # Start all services
make dev-detached     # Background mode
make stop             # Stop all
make clean            # Stop and remove volumes

# Logs
make logs             # All services
make logs-backend     # Backend only
make logs-frontend    # Frontend only

# Database
make db-push          # Push schema
make db-studio        # Drizzle Studio
make migrate          # Run migrations
```

---

## Conventions

### Code Style
- **TypeScript**: Strict mode enabled
- **Imports**: Use `@/` alias for project imports
- **Components**: PascalCase, one per file
- **Hooks**: camelCase starting with `use`
- **Types**: PascalCase, exported from `types/` directory

### Error Handling
- Backend: Throw errors, let Elysia handle responses
- Frontend: Use TanStack Query error states, show Alert components
- Always provide user-friendly error messages

### State Management
- Server state: TanStack Query
- Client state: React useState/useReducer
- Global UI state: React Context (if needed)
- Avoid: Redux, Zustand (not needed currently)

### Styling
- Use Tailwind CSS exclusively
- Follow shadcn/ui patterns
- Use `cn()` utility for conditional classes
- Support dark mode (built into shadcn)

---

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/shcheck
REDIS_URL=redis://localhost:6379
SHCHECK_SCRIPT_PATH=/app/shcheck/shcheck.py
```

---

## Scanning Internal/Local Services

When running with Docker, the backend container runs in an isolated network namespace and cannot access services on your host machine using `localhost`. To scan services running on your device (e.g., `localhost:9090`), use `host.docker.internal` instead.

### How It Works

The Docker Compose files are configured with `extra_hosts` to map `host.docker.internal` to your host machine:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Scanning Local Services

Instead of scanning `http://localhost:9090`, use:

```
http://host.docker.internal:9090
```

**Examples:**
- Local dev server on port 3000: `http://host.docker.internal:3000`
- Local API on port 8080: `http://host.docker.internal:8080`
- Local service on port 9090: `http://host.docker.internal:9090`

### Platform Notes

| Platform | Support | Notes |
|----------|---------|-------|
| **Docker Desktop (Mac/Windows)** | ✅ Native | `host.docker.internal` works out of the box |
| **Linux (docker-compose)** | ✅ With config | `extra_hosts` mapping enables it |
| **Linux (docker run)** | ✅ With flag | Use `--add-host=host.docker.internal:host-gateway` |

### Alternative: Host Network Mode (Linux only)

If you prefer, you can use host network mode on Linux by uncommenting in `docker-compose.yml`:

```yaml
backend:
  network_mode: host
```

**Note:** This only works on Linux and removes network isolation between the container and host.

### Troubleshooting

If `host.docker.internal` doesn't work:

1. **Find your host IP address:**
   ```bash
   # macOS
   ipconfig getifaddr en0

   # Linux
   ip addr show docker0 | grep inet

   # Windows
   ipconfig
   ```

2. **Use the IP directly:**
   Instead of `http://host.docker.internal:9090`, use `http://192.168.1.100:9090` (your actual IP)

3. **Verify connectivity:**
   ```bash
   docker-compose exec backend sh
   # Then inside the container:
   wget http://host.docker.internal:9090
   ```

---

## Credits & License

- **shcheck**: Core scanner by [santoru](https://github.com/santoru/shcheck) (GPL v3)
- **UI**: Created by [Dzulfikar](https://github.com/dzulfiikar) and Kimi K2.5
- **License**: MIT (this project), GPL v3 (shcheck)

---

## Troubleshooting

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

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev | `make dev` |
| Build | `cd frontend && npm run build` or `cd backend && npm run build` |
| Add component | `npx shadcn@latest add name` |
| DB changes | `make db-push` |
| Run tests | `make test` |
| View logs | `make logs-backend` |
| Shell access | `make shell-backend` |

---

## Important Notes

1. **Always use case-insensitive header lookups** - HTTP headers can have varying cases (e.g., `Content-Security-Policy` vs `content-security-policy`). The backend uses `toLowerCase()` comparisons.
2. **BullMQ jobs are processed async** - Use SSE or polling for status updates
3. **CSP evaluation is post-process** - Added after shcheck completes in `shcheck.service.ts`
4. **shcheck runs in Python subprocess** - Backend spawns Python process
5. **Redis is required** - For BullMQ queue functionality
6. **PostgreSQL is required** - For scan persistence
7. **shcheck is downloaded at build time** - Dockerfiles fetch latest from GitHub master, no local `shcheck/` directory needed
