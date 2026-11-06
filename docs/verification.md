# Verification and acceptance matrix

Status legend: **PASS** (executed, evidence recorded), **READY** (test written, needs live API), **BLOCKED** (dependency not yet merged), **UNVERIFIED** (not exercised).

Modules 1–6 are integrated. The live workflow checks require a migrated and seeded SQLite database and a running API; contract fixtures alone are not database or platform evidence.

## Acceptance matrix

| # | Behavior / invariant | Check | Status |
|---|---|---|---|
| 1 | Contract schemas, fixtures, error shapes, UTC date filter | `packages/contracts/tests` (`npm test`) | See "Executed checks" |
| 2 | Offer a ride, then find it via search | `tests/integration/workflow.test.ts` | PASS |
| 3 | Immediate booking without driver approval | same, first test | PASS |
| 4 | Duplicate booking rejected | same | PASS |
| 5 | Self-booking rejected | same | PASS |
| 6 | Full ride rejected; concurrent bookings never exceed capacity (SQLite) | same, concurrency test | PASS |
| 7 | Rider cancel restores one seat; repeat cancel is safe; rebooking works | same | PASS |
| 8 | Driver cancel cancels bookings, blocks new bookings | same | PASS |
| 9 | Booking-versus-cancellation races | `apps/api/src/db/persistence.test.ts` | PASS |
| 10 | Departed ride rejected for booking | live workflow test with seeded departed ride | PASS |
| 11 | Validation and demo-user errors (400 shapes) | live workflow tests | PASS |
| 12 | Wrong actor restrictions | live workflow tests | PASS |
| 13 | User switching changes actor and refreshes activity | manual/E2E on UI | PASS (web) |
| 14 | Persistence across client and API reloads | restart API, re-query activity | PASS (API restart) |
| 15 | Same workflow on web / Android / iOS; shared API connectivity | manual per platform | UNVERIFIED |
| 16 | Accessibility and responsive behavior | manual per platform | UNVERIFIED |
| 17 | Lint, type-check, builds | commands below | See "Executed checks" |

## Running integration checks

```
npm run db:migrate && npm run db:seed
npm run dev:api
INTEGRATION_API_BASE_URL=http://localhost:3000 npx tsx --test tests/integration/*.test.ts
```

Without `INTEGRATION_API_BASE_URL` the tests are skipped, so `npm test` is unaffected. The tests create rides labelled "Integration Origin" and "Adapter Origin" and need the seeded demo users. Use a disposable database for test runs.

## Executed checks

See the results table below, updated with each run.

| Command | Result |
|---|---|
| `npm test` | PASS, 7 of 7 (contracts and foundation only) |
| `npm run lint` | PASS, no errors |
| `npm run typecheck` | PASS for existing workspaces; `tests/integration` is not covered by any workspace tsconfig (request to Module 1) |
| `INTEGRATION_API_BASE_URL=http://localhost:3138 npx tsx --test tests/integration/*.test.ts` | PASS, 6 of 6 against a migrated, seeded SQLite database |
| `npx tsx --test apps/api/src/db/persistence.test.ts` | PASS, 10 of 10 against an isolated migrated, seeded SQLite database |
| `npm run build` | PASS (API and web export) |

## Platform coverage

Web: mock offer, booking and cancellation and switching to the live API were exercised in a browser using an exported build. Android and iOS: **UNVERIFIED**.
