# Carpool application prototype plan

## Goal and approach

Build a carpool prototype for Rogers people that demonstrates offering rides, finding them, and automatically booking available seats on Android, iOS, and web. The repository currently contains only a README, so this is a new application rather than an extension of an existing codebase.

Use Expo and React Native with TypeScript for a shared mobile and web frontend, and a separate Next.js API backend with Prisma and a local SQLite database. Seed fictional users and rides, and provide a demo-user selector without sign-in. Persist changes on the local API server so connected mobile and web clients share the same data. The selector is for demonstration only and does not authenticate or authorize real people. SQLite is intended for a single local deployment, not a distributed or horizontally scaled deployment.

## Confirmed scope and behavior

- People can offer rides, search for rides, and book available seats immediately without driver approval.
- Use fictional sample users and demo data; do not restrict access or implement employee sign-in in this prototype.
- Provide one shared Expo frontend for Android, iOS, and web, with a Next.js API backend. Mobile clients access the same locally hosted API as the web client.
- Persist shared demo data in local SQLite using Prisma.
- Use city or neighborhood names for origins and destinations; no map or exact street address is required.
- Riders can cancel bookings and drivers can cancel rides. A rider cancellation restores capacity; cancelling a ride makes it unavailable for new bookings and marks affected bookings cancelled.
- Exclude payments, recurring rides, notifications, and administrative tooling from this prototype. Do not treat demo identities or displayed contact details as verified.

## Parallel work and coordination gates

Assign one owner to each of the six modules below. Paths describe a proposed minimal structure, not existing application files. This document reorganizes implementation work only; it does not implement the application or require installing Spec Kit.

Owners may read other modules' files but request changes from their owners instead of editing them concurrently. Module 1 alone owns all shared manifests, lockfiles, configuration, and contracts. Module 2 alone owns Prisma schema, migrations, seed data, and database access. Module 6 alone owns README and handoff documents. Shared dependency additions go through Module 1, even when requested by another module.

| Gate | Required result | What can proceed |
|---|---|---|
| G1: freeze contracts | Module 1 records journeys, input limits, response/error shapes, time/filter semantics, demo identity behavior, and shared fixtures; all owners agree. | Persistence design, API logic against fakes, UI against mock responses, and acceptance-test preparation. |
| G2: minimal scaffold | Module 1 delivers runnable Expo/Next.js shells, shared imports, scripts, and environment/network configuration; Module 2 supplies Prisma/SQLite configuration needs. | Independent implementation and local module checks in owned directories. |
| G3: persistence ready | Module 2 supplies migrations, seed data, constraints, typed database access, and the transaction interface. | Real-database integration for Modules 3 and 4. |
| G4: integrated workflow | Modules 3/4 expose real endpoints, Module 5 uses them, and seed data is available. | Complete cross-platform workflow verification and final handoff by Module 6. |

G1/G2 are short common prerequisites, not six competing setup efforts. After them, Modules 2-6 can work in parallel using fixtures or fakes. Booking logic can use seeded rides without waiting for the creation endpoint; the real offer-to-book journey still requires both APIs. End-to-end validation and final documentation follow integration. After G1, contract changes must be agreed with affected owners and update types, fixtures, implementations, and tests together.

## Shared interface contract

Module 1 publishes shared TypeScript DTOs and feature-facing repository interfaces in `packages/contracts/src/`, with JSON fixtures in `packages/contracts/fixtures/`. Keep server-only Prisma types out of the frontend. The following is the baseline design for freezing at G1, not additional confirmed product scope.

- **Demo identity:** Opaque string IDs. `DemoUser` has `id`, `displayName`, and optional fictional `contactDetails`. Actor-dependent requests use `X-Demo-User-Id`; the API checks that the selected demo user exists. Read-only discovery requires no sign-in. The header does not authenticate a person or establish employee eligibility.
- **Ride:** `id`, `driverId`, `origin`, `destination`, `departureTime`, `seatCapacity`, `remainingSeats`, and `status` (`ACTIVE` or `CANCELLED`). Locations are trimmed non-empty city/neighborhood names. At G1, record exact string-length limits and the positive integer capacity limit so server/UI tests agree. An active booking reserves one seat.
- **Time/filter rules:** Accept ISO 8601 departure instants with an offset, store consistently in UTC, and check future departure on the server. Proposed discovery filters are optional `origin`, `destination`, and `date=YYYY-MM-DD`: case-insensitive location substring matching, a UTC calendar-day half-open interval, and ordering by departure then ID. Freeze these semantics at G1. Label the search date's time zone and show departures with a clear display time zone. Discovery lists upcoming active rides, including full rides with zero remaining seats.
- **Booking/activity:** `Booking` has `id`, `rideId`, `riderId`, and `status` (`ACTIVE` or `CANCELLED`). My activity returns the selected user's offered rides and bookings with ride details, including cancelled items.
- **Results/errors:** Use `{ data: ... }` for success and `{ error: { code, message, fieldErrors? } }` for explicit failure. Freeze typed errors for validation, missing/unknown demo user, not found, wrong actor, self-booking, duplicate active booking, full/cancelled/departed ride, and temporary database contention. Proposed HTTP statuses: 400 invalid input/demo selection, 403 wrong actor/self-booking, 404 missing record, 409 booking-state conflict, 503 exhausted contention retries. Actor restrictions operate on the supplied demo identity, not a verified person.

| Endpoint | Request / selected actor | Success payload | Owner |
|---|---|---|---|
| `GET /api/demo-users` | No actor required | `DemoUser[]` | 3 |
| `POST /api/rides` | Driver; `{ origin, destination, departureTime, seatCapacity }` | 201: `Ride` | 3 |
| `GET /api/rides` | Optional frozen discovery filters | 200: `Ride[]` | 3 |
| `POST /api/rides/:rideId/bookings` | Rider; no client capacity/status | 201: `{ booking, ride }` | 4 |
| `POST /api/bookings/:bookingId/cancel` | Booking's rider | 200: `{ booking, ride }` | 4 |
| `POST /api/rides/:rideId/cancel` | Ride's driver | 200: `{ ride, cancelledBookingIds }` | 4 |
| `GET /api/me/activity` | Selected user | 200: `{ offeredRides, bookings }` | 4 |

All payloads use the success envelope above. Authorized cancellation is repeat-safe and never restores seats twice. Driver cancellation cancels affected active bookings atomically; later rider cancellation cannot alter capacity. New bookings reject full, cancelled, or departed rides. No additional past-departure cancellation restriction is introduced.

Shared fixtures include fictional drivers/riders; upcoming available, full, cancelled, and departed rides; active/cancelled bookings; empty lists; success responses; and each error shape. Tests use a fixed clock; runtime seed departures are upcoming relative to seed execution. Module-local mocks/tests remain with their owners; shared fixture edits go through Module 1.

## Module 1: Shared foundation and contracts

**Scope:** Original activities 1 and 2, plus the shared-contract portion of activity 4.

**Exclusive ownership:** Root workspace manifests/lockfiles/scripts/ignore rules; every package's manifests and tooling/environment configuration; `packages/contracts/**`; `docs/foundation.md`; Expo bootstrap `apps/mobile/app/_layout.tsx`; and Next.js bootstrap/middleware/cross-origin configuration. Feature routes/screens, Prisma files, README, and integration tests belong to other modules. Bootstrap consumes feature exports supplied by their owners rather than editing feature files.

**Deliverables**

- Core journeys, required ride fields/input limits, booking confirmation and demo-user display decisions, empty/loading/error states, accessibility/responsive expectations, and non-production limitations.
- Minimal Expo React Native TypeScript Android/iOS/web shell and separate Next.js TypeScript API, shared imports, and startup/test/lint/type-check/build scripts.
- Frozen DTOs, repository method signatures for feature fakes, endpoint/error/time semantics, and shared fixtures at G1. Module 2 supplies storage mapping details without exposing Prisma to the UI.
- Per-platform API base URL examples, browser cross-origin setup where required, and networking/prerequisite notes for Module 6. Coordinate Prisma dependency/script/environment wiring with Module 2. Ignore secrets and generated SQLite database/sidecar files.

**Independent start / dependencies:** Start immediately. Use static API responses and placeholder feature exports to check shells. Gather other owners' configuration needs and complete G1/G2 before expecting independently executable feature work.

**Acceptance criteria:** Shared types are importable in both apps; fixtures match frozen payloads; shells have documented run paths for all three Expo targets and API; mobile URLs are configurable rather than hard-coded to host `localhost`; exact input limits and acceptance expectations are recorded; shared files have a single owner.

## Module 2: Persistence, integrity, and seed data

**Scope:** Original activity 3 and the persistence-specific part of activity 2.

**Exclusive ownership:** `apps/api/prisma/**` (schema, migrations, seeds), `apps/api/src/db/**` (Prisma client, database access and persistence tests), and `docs/persistence.md`. Request shared dependency/configuration changes from Module 1. No feature route/service edits.

**Deliverables**

- Prisma SQLite models/relations for sample users, rides, capacity, departure time, and bookings/statuses; reproducible migrations and foreign-key/capacity/status integrity constraints.
- Database-enforced uniqueness of active `(rideId, riderId)` bookings, for example a SQLite partial unique index in a migration; cancelled historical bookings must permit rebooking.
- A shared typed database client/transaction entrypoint and storage mapping for Modules 3/4. Feature modules do not create independent Prisma clients.
- Fictional seed data covering relevant ride/booking states, stable seed identities, repeatable non-destructive insertion, and an explicit opt-in reset rather than unexpected overwrites of user-created demo data.
- Migration/seed notes and isolated test-database setup, using the same SQLite provider as the prototype.

**Transactional contract:** For active rides, `remainingSeats = seatCapacity - activeBookingCount`, bounded between zero and capacity. Cancelled rides have zero bookable seats and no active bookings. Module 2 owns constraints and transaction access; Module 4 alone owns booking/cancellation business transactions. Module 3 only creates rides with all seats available and no bookings.

Module 4 atomically rechecks ride state/time, conditionally reserves a seat, and inserts a booking; a failed/duplicate insert rolls back the seat change. Cancellation changes booking/ride state and capacity in the same transaction. Agree SQLite contention handling at G3: bounded retries of the whole transaction followed by an explicit error, never unchecked read-then-write, client-side counts, or a process-local lock as the integrity mechanism.

**Independent start / dependencies:** Design after G1; implement after G2 with contract fixtures and an isolated database. No endpoint prerequisite. Publish storage access early so API owners can use fakes until G3.

**Acceptance criteria:** Fresh migrations and repeated non-destructive seeds work; invalid relations/capacity and duplicate active bookings are rejected; cancelled bookings allow rebooking; seed times/data are consistent and fictional; G3 exposes agreed transaction access; no local database files are committed.

## Module 3: Ride creation, discovery, and demo-user API

**Scope:** Original activity 4, consuming Module 1's shared contracts.

**Exclusive ownership:** `apps/api/app/api/demo-users/route.ts`, `apps/api/app/api/rides/route.ts`, `apps/api/src/features/demo-users/**`, and `apps/api/src/features/rides/**`, including their validation/services/fakes/unit and endpoint tests. Module 4 owns nested `rides/[rideId]/**`; Module 2 owns storage; Module 1 owns shared HTTP/bootstrap utilities.

**Deliverables:** Demo-user listing, server-validated ride creation for the selected driver with location/future departure/capacity, and upcoming active discovery with frozen location/date filters, deterministic ordering, remaining seats, empty results, and explicit API errors.

**Independent start / dependencies:** After G1/G2, use typed repository fakes and fixed-clock ride fixtures. Real storage requires G3, not booking implementation. Integrated discovery must reflect capacity updates made by Module 4.

**Acceptance criteria:** Invalid fields/capacity/time and unknown demo driver return agreed errors; creation initializes seats correctly; discovery excludes cancelled/departed rides, represents full rides as zero seats, and respects frozen location/date boundaries. Unit/endpoint tests cover success and failure shapes; real database checks follow G3.

## Module 4: Booking, cancellation, and my-activity API

**Scope:** Original activity 5 and all capacity-changing business operations.

**Exclusive ownership:** `apps/api/app/api/rides/[rideId]/**`, `apps/api/app/api/bookings/**`, `apps/api/app/api/me/**`, and `apps/api/src/features/bookings/**`, including services/fakes/unit/endpoint/transaction tests. No shared-contract, schema, Prisma client, or Module 3 collection-route edits.

**Deliverables**

- Immediate one-seat booking without driver approval and the selected user's offered rides/bookings view.
- Server-enforced capacity, no self-booking, no duplicate active booking, and full/cancelled/departed ride rejection.
- Rider cancellation restoring capacity exactly once and driver cancellation atomically cancelling affected bookings and preventing new bookings; check the selected actor for both.
- Atomic operations implementing Module 2's transactional contract, race-safe rollback, bounded contention handling, and explicit errors.

**Independent start / dependencies:** After G1/G2, implement against fake users/rides/bookings and a fixed clock. After G3, real transaction tests use seeded rides without needing Module 3's creation endpoint. Complete creation-to-booking workflow needs Modules 3/5 at G4.

**Acceptance criteria:** Concurrent successes never exceed capacity; seat counts remain bounded; uniqueness and no-self-booking rules hold; full/cancelled/departed/wrong-actor cases return agreed errors. Duplicate cancellation adds no seats, rider cancellation permits rebooking, and booking racing driver cancellation leaves no active booking on a cancelled ride. My activity accurately reflects selection and affected cancellations.

## Module 5: Cross-platform Expo experience

**Scope:** Original activity 6.

**Exclusive ownership:** `apps/mobile/app/**` except Module 1's `_layout.tsx`, and `apps/mobile/src/**` (screens/components/navigation exports/API adapter/mock adapter/UI tests). Module 1 owns mobile manifests/environment/bootstrap configuration.

**Deliverables**

- Shared demo-user switcher, ride creation/search, immediate booking confirmation, my rides/bookings, and rider/driver cancellation screens for Android/iOS/web.
- A typed API adapter and replaceable mock adapter using shared fixtures, allowing development without live APIs.
- Platform-appropriate navigation, responsive layouts, readable loading/empty/error/success feedback, web keyboard access, accessible labels/status/error messages, and clear time-zone display.
- Explicit demo-identity/contact warnings. Switching users refreshes actor-specific data and avoids stale previous-user activity. Booking results use server responses, not client seat counts.
- Real shared-API connectivity through Module 1's platform-specific configuration.

**Independent start / dependencies:** Build after G1/G2 against available/full/cancelled/departed, empty, loading, success, and failure mocks. Real binding depends on G3 and Modules 3/4; platform integration requires G4.

**Acceptance criteria:** Every core journey/state works with mocks then the real API on available targets; selection changes the request actor and refreshes activity; cancellations refresh seats/statuses; validation and server conflicts are visible. Navigation, keyboard access, accessibility, responsive layout, and time-zone display meet G1 expectations without claiming untested platform coverage.

## Module 6: QA, integration verification, and handoff

**Scope:** Original activities 7 and 8. Feature owners still supply module-level tests; this owner integrates acceptance evidence and documentation.

**Exclusive ownership:** `tests/integration/**`, `tests/e2e/**` and their isolated fixtures, `docs/verification.md`, `docs/future-production.md`, `README.md`, and coordinated later edits to root `plan.md`. Shared test scripts/dependencies/configuration go through Module 1; feature/database fixes go to their owners.

**Deliverables**

- Acceptance matrix mapping all original journeys/invariants to cases, results, and platform coverage; prepare early with shared fixtures without counting mock-only checks as database/platform evidence.
- Real integration checks for creation/search/immediate booking, full/concurrent/duplicate attempts, cancellation/rebooking, booking-versus-cancellation races, cancelled/departed rides, validation, actor restrictions, user switching, and persistence across client/API reloads.
- The same workflow on available web/Android/iOS simulators/devices, shared API connectivity, accessibility and responsive behavior, plus targeted tests, lint, type-check, and applicable builds. Record failures and unavailable/unexercised platforms explicitly.
- README with prerequisites, API/Expo startup, migration/non-destructive seed instructions, web/mobile commands, simulator/device networking, browser cross-origin setup, verification commands, scope/exclusions, SQLite deployment limits, and lack of real authentication/privacy protections. Incorporate Modules 1/2's notes without concurrent README edits.
- Preserve the approved plan at root `plan.md` and a separate future-production discovery checklist; do not implement checklist features.

**Independent start / dependencies:** Prepare matrix/document skeleton immediately. Executable contract/mock checks need G1/G2; SQLite/concurrency checks need G3 and Module 4; full workflows/platform evidence need G4. Final README commands are verified against the integrated application.

**Acceptance criteria:** Every confirmed behavior has evidence or an explicit blocked/unverified status; concurrency uses SQLite rather than only fakes; persistence/shared-client connectivity are demonstrated; available-platform accessibility/responsiveness is checked; handoff commands are reproducible and unavailable platform coverage is disclosed.

## Coverage of the original eight activities

| Original activity | Module responsibility |
|---|---|
| 1. Define prototype details and acceptance criteria | 1 defines/freezes; 6 collects evidence. |
| 2. Initialize the application | 1 owns scaffolding/configuration; 2 supplies Prisma/SQLite setup. |
| 3. Design and seed the data model | 2. |
| 4. Implement the API and ride discovery | 1 freezes contracts; 3 implements. |
| 5. Implement booking and cancellation | 4 uses 2's constraints/transaction access. |
| 6. Build the cross-platform experience | 5. |
| 7. Verify the complete workflow | 6 integrates evidence; 2-5 supply module tests. |
| 8. Document and hand off | 6 incorporates 1/2's setup notes and all owners' results. |

## Shared limitations and considerations

- A phone or emulator cannot necessarily reach the development machine's `localhost`. Configure/document a reachable development address, browser cross-origin access where required, and platform-specific networking; expose only fictional data on trusted networks.
- iOS/Android validation depends on available Apple/Android tooling or suitable physical devices. Report any unexercised platform. App-store publishing and production deployment remain outside prototype scope.
- SQLite is for a single local deployment, not distributed/horizontally scaled servers. Connected clients share the local API database; client-only storage is not a replacement. Migrations/seeds must be repeatable and avoid unexpectedly overwriting user-created demo data. Store departure timestamps consistently and display the time zone clearly.
- Capacity correctness is a database transaction invariant, including simultaneous requests. Demo identity checks do not supply real authentication, authorization, verified contacts, or privacy protection.
- Do not use real employee details. No production deployment or real user data should be used without appropriate Rogers approvals, identity controls, security/privacy review, retention rules, abuse handling, and an operational deployment design.
- Future production discovery should assess company SSO/employee eligibility, privacy/precise-location sharing, safety/support policies, production database/hosting, monitoring, accessibility, and whether notifications, recurring rides, payments, or admin tools are warranted. Record these separately; they are not prototype commitments.
