# Verification and acceptance matrix

Status legend: **PASS** (executed, evidence recorded), **READY** (test written, needs live API), **BLOCKED** (dependency not yet merged), **UNVERIFIED** (not exercised).

State at authoring: only Module 1 (contracts, scaffolds, health endpoint) is on this branch. Modules 2-5 (Prisma/SQLite, ride and booking endpoints, Expo UI) are not integrated, so no database, API workflow, or platform evidence exists yet. Contract fixtures are not counted as database or platform evidence.

## Acceptance matrix

| # | Behavior / invariant | Check | Status |
|---|---|---|---|
| 1 | Contract schemas, fixtures, error shapes, UTC date filter | `packages/contracts/tests` (`npm test`) | See "Executed checks" |
| 2 | Offer a ride, then find it via search | `tests/integration/workflow.test.ts` | READY (needs Modules 2, 3) |
| 3 | Immediate booking without driver approval | same, first test | READY (needs Module 4) |
| 4 | Duplicate booking rejected | same | READY |
| 5 | Self-booking rejected | same | READY |
| 6 | Full ride rejected; concurrent bookings never exceed capacity (SQLite) | same, concurrency test | READY |
| 7 | Rider cancel restores one seat; repeat cancel is safe; rebooking works | same | READY |
| 8 | Driver cancel cancels bookings, blocks new bookings | same | READY |
| 9 | Booking-versus-cancellation races | not yet written | BLOCKED (needs Module 4) |
| 10 | Departed ride rejected for booking | needs clock control or seeded departed ride | BLOCKED |
| 11 | Validation and demo-user errors (400 shapes) | same, last test | READY |
| 12 | Wrong actor restrictions | same | READY |
| 13 | User switching changes actor and refreshes activity | manual/E2E on UI | BLOCKED (Module 5) |
| 14 | Persistence across client and API reloads | restart API, re-query activity | BLOCKED |
| 15 | Same workflow on web / Android / iOS; shared API connectivity | manual per platform | UNVERIFIED |
| 16 | Accessibility and responsive behavior | manual per platform | UNVERIFIED |
| 17 | Lint, type-check, builds | commands below | See "Executed checks" |

## Running integration checks

```
npm run db:migrate && npm run db:seed
npm run dev:api
INTEGRATION_API_BASE_URL=http://localhost:3000 npx tsx --test tests/integration/*.test.ts
```

Without `INTEGRATION_API_BASE_URL` the tests are skipped, so `npm test` is unaffected. Wiring them into the shared `test` script is a request to Module 1. The tests create rides labelled "Integration Origin" and need at least three seeded demo users.

## Executed checks

See the results table below, updated with each run.

| Command | Result |
|---|---|
| `npm test` | PASS, 7 of 7 (contracts and foundation only) |
| `npm run lint` | PASS, no errors |
| `npm run typecheck` | PASS for existing workspaces; `tests/integration` is not covered by any workspace tsconfig (request to Module 1) |
| `npx tsx --test tests/integration/*.test.ts` | 4 skipped (no live API) |
| `npm run build` | Not run |

## Platform coverage

Web, Android, and iOS: **UNVERIFIED**. No UI or real API exists on this branch yet; record device/simulator, API address, and outcome here when exercised.
