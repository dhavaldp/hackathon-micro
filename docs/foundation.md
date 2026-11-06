# Module 1: foundation handoff

## Scope and gate status

This workspace contains shared contracts, a Next.js API shell, and an Expo
React Native TypeScript shell for web, Android, and iOS. It does **not** contain
ride/booking endpoints, feature screens, a Prisma schema, migrations, or seeds.
The only implemented API endpoint is `GET /api/health`; its
`scope: "foundation-only"` response does not claim database readiness.

Contract version `1.0.0` implements the baseline in `plan.md` with the exact
decisions below. G1's contract artifacts are ready for review; the coordinating
owner must collect Modules 2-6's acknowledgements before declaring the
cross-owner freeze complete. G2's shells/configuration are available; Module 2
still needs to confirm Prisma wiring. G3 (persistence) and G4 (end-to-end
integration) are not complete. Do not count foundation mocks as product evidence.

Module 1 owns manifests, lockfiles, tooling/configuration, bootstrap, contracts,
fixtures, and this document. Module 2 owns `apps/api/prisma/**` and
`apps/api/src/db/**`; Module 3 owns demo-user/ride collection routes and their
features; Module 4 owns nested ride actions, booking/my-activity routes and
booking features; Module 5 owns mobile screens/navigation except `_layout.tsx`;
Module 6 owns README, verification/future-production docs, and integration tests.
Request shared-file changes from Module 1 rather than editing them concurrently.
README is intentionally left untouched for Module 6.

## Prerequisites and commands

Use Node 22.13 or newer and npm workspaces. Install from the repository root
with `npm ci` after the lockfile is present (`npm install` when changing
dependencies). Expo SDK 55 uses React 19.2 and its aligned React Native version;
both applications consume the local `@carpool/contracts` TypeScript package.
No contracts publishing or build step is required. Next transpiles the package;
Expo Metro resolves the npm workspace. Prisma 6 is pinned for the local SQLite
workflow; it is a dependency, not a claim that persistence is implemented.

| Command from root | Purpose |
|---|---|
| `npm run dev:api` | Next API on port 3000, listening on development interfaces. |
| `npm run dev:web` | Expo web, normally port 8081. |
| `npm run dev:mobile` | Expo QR/dev server for mobile clients. |
| `npm run dev:android` | Open Android emulator/device via Expo; requires Android tooling. |
| `npm run dev:ios` | Open iOS simulator via Expo; requires macOS/Xcode. |
| `npm test` | Contract fixture/validation and API bootstrap tests. |
| `npm run typecheck` | Type-check all three workspaces. |
| `npm run lint` | ESLint across owned source/configuration. |
| `npm run build:api` | Next production build. |
| `npm run build:web` | Expo static web export to `apps/mobile/dist/`. |
| `npm run build:mobile` | Bundle Android/iOS JavaScript; not native binaries or device testing. |
| `npm run build` | API and web builds. |
| `npm exec --workspace @carpool/mobile -- expo install --check` | Check Expo dependency alignment. |

Mobile native execution additionally requires a compatible Expo Go installation
or a development build, Android SDK/emulator or physical device, and/or an iOS
simulator/physical device. JavaScript exports alone do not demonstrate native
runtime compatibility or accessibility. Module 6 must report any unexercised
platform. App-store publishing is out of scope.

Environment files are examples, not secrets. Copy `apps/mobile/.env.example`
to `apps/mobile/.env` and set `EXPO_PUBLIC_API_BASE_URL`. Copy
`apps/api/.env.example` to `apps/api/.env` and set
`CORS_ALLOWED_ORIGINS` and, once persistence exists, `DATABASE_URL`.
Restart both dev servers after changing configuration.

- Web and iOS simulator on the same machine: `http://localhost:3000`.
- Android emulator: normally `http://10.0.2.2:3000`.
- Physical devices: `http://<development-machine-LAN-IP>:3000`, on the same
  trusted network with firewall access to ports 3000 and 8081.
- `localhost` on a phone is the phone, not the development computer. Expo's
  bundler tunnel does not automatically tunnel the API.
- Add exact Expo **web** origins, including scheme and port, to the API's
  comma-separated allowlist; for example `http://localhost:8081` or
  `http://<LAN-IP>:8081`. No wildcard origin or credentialed CORS is enabled.
  Native fetch normally has no browser Origin header. Requests without Origin
  remain allowed; CORS is not an authentication or network-security boundary.
- The API listens on all interfaces for device access. Expose fictional data
  only on trusted networks; do not publish this unauthenticated API publicly.
  Plain HTTP is development-only. Native development-build transport policies
  may need platform configuration when those builds are introduced.

The Expo bootstrap displays the configured URL and has an explicit
connectivity check with a timeout and readable failure message. It imports
shared response validation and calls `/api/health`, not mock product endpoints.
Module 5 replaces the bootstrap panel with its navigation exports through the
Module 1 owner, retaining the shared API configuration.
`app/index.tsx` is a null bootstrap route registration so Expo Router can resolve
`/` before feature screens exist; Module 5 owns its replacement. It adds no
feature UI. Without this minimal prerequisite, a layout-only router reports
an unmatched route.

## Contract decisions

Import DTOs, schemas, constants, and repository interfaces from
`@carpool/contracts`. Import test/mock fixtures from
`@carpool/contracts/fixtures`; do not import fixtures into production endpoint
implementations as a substitute for SQLite.

### Input, identity, and discovery

- Opaque IDs: trimmed non-empty strings up to 100 characters.
- Origins/destinations: trimmed city/neighborhood strings, 1-100 characters.
  No map or exact address; names are not geographic verification.
- Seat capacity: integer 1-8; one seat per active booking.
- Departure: calendar-valid ISO 8601 timestamp with `Z` or explicit offset.
  Normalize to UTC in storage/response; strictly later than the server clock
  on creation and strictly later than the query clock in discovery/booking.
  Use `createRideSchemaAt(now)` with an injected test clock, not the fixture
  clock in live requests.
- Search: optional origin/destination, case-insensitive substring matching;
  trim the filters. Optional `date` is a valid `YYYY-MM-DD` UTC day, with
  `start <= departure < end`. `utcDateRange` supplies the boundaries.
  Order by departure time, then ID ascending. Return upcoming `ACTIVE` rides,
  including full ones with zero remaining seats. No pagination is introduced.
- UI search date is explicitly labelled UTC; departure/confirmation displays
  show the chosen local time zone and enough date/time detail to avoid ambiguity.
- `X-Demo-User-Id` selects a seeded user on actor-dependent requests.
  Validate its presence and existence server-side; do not accept actor IDs
  in create/booking bodies. User switching offers no identity protection.
  Show fictional display names and a visible demo-only disclaimer; any
  displayed contact information remains fictional and unverified.

### DTOs and endpoints

`Ride`: `id`, `driverId`, `origin`, `destination`, `departureTime`,
`seatCapacity`, `remainingSeats`, `status: ACTIVE | CANCELLED`.
`Booking`: `id`, `rideId`, `riderId`, `status: ACTIVE | CANCELLED`.
`DemoUser`: `id`, `displayName`, optional `contactDetails`.
`Activity`: `offeredRides: Ride[]`, `bookings: (Booking & { ride: Ride })[]`,
including cancelled items. Success responses are `{ data: payload }`.

| Method and path | Request | Payload / status |
|---|---|---|
| `GET /api/demo-users` | No selected actor | `DemoUser[]`, 200 |
| `GET /api/rides` | Frozen optional query filters | `Ride[]`, 200 |
| `POST /api/rides` | Selected driver; `CreateRideRequest` | `Ride`, 201 |
| `POST /api/rides/:rideId/bookings` | Selected rider; no body required | `{ booking, ride }`, 201 |
| `POST /api/bookings/:bookingId/cancel` | Booking's selected rider; no body required | `{ booking, ride }`, 200 |
| `POST /api/rides/:rideId/cancel` | Ride's selected driver; no body required | `{ ride, cancelledBookingIds }`, 200 |
| `GET /api/me/activity` | Selected actor | `Activity`, 200 |

Resource path builders encode IDs. Booking/cancellation endpoints must reject
attempts to supply capacity, status, or another actor rather than trusting them.
Cancellation is repeat-safe: a second authorized cancellation succeeds with
cancelled state and never increments capacity twice. Driver cancellation
cancels all active bookings atomically; repeating it returns no newly cancelled
IDs. No additional departed-ride cancellation restriction is introduced.

Errors use `{ error: { code, message, fieldErrors? } }`; `fieldErrors` maps
field names to arrays of readable messages. `ERROR_STATUS` is authoritative:

| HTTP | Codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `DEMO_USER_REQUIRED`, `DEMO_USER_NOT_FOUND` |
| 403 | `WRONG_ACTOR`, `SELF_BOOKING`, `ORIGIN_NOT_ALLOWED` |
| 404 | `NOT_FOUND` |
| 409 | `DUPLICATE_BOOKING`, `RIDE_FULL`, `RIDE_CANCELLED`, `RIDE_DEPARTED` |
| 503 | `DATABASE_BUSY` |
| 500 | `INTERNAL_ERROR` |

Shared `jsonSuccess`/`jsonError` helpers live in `apps/api/lib/http.ts`.
API owners must explicitly surface expected failures and log unexpected errors
server-side without leaking internals into responses. No success-shaped error
fallbacks. CORS proxy handles exact allowlisted origins and OPTIONS preflight
for GET/POST and Content-Type/demo-user headers.

### Repository and transaction handoff

The shared package declares feature-facing contracts, not a database
implementation: `DemoUserRepository.list/findById`,
`RideRepository.create/listUpcoming`, `ActivityRepository.forUser`, and
`BookingRepository.transaction`. Module 2 implements storage mapping and
the single Prisma client; Modules 3/4 supply fakes while awaiting G3.

`BookingTransaction` exposes `findRide`, `findBooking`, `findActiveBooking`,
`reserveSeat`, `insertBooking`, `cancelActiveBooking`, `restoreSeat`, and
`cancelRideAndBookings`. Implement these semantics in Module 2:

- Reads/writes use the same transaction client. `reserveSeat` conditionally
  decrements only an active, future ride with a positive remaining count and
  returns whether it changed the row.
- `insertBooking` relies on database-enforced active uniqueness.
  `cancelActiveBooking` returns true only for an ACTIVE-to-CANCELLED transition.
  `restoreSeat` increments once only on an active ride and must not exceed
  capacity; invalid transitions fail explicitly.
- `cancelRideAndBookings` sets the ride cancelled with zero bookable seats,
  cancels active bookings, and returns the updated ride and changed booking IDs.
  Its repeat call returns no newly changed IDs.
- Throw typed `PersistenceError("DUPLICATE_ACTIVE_BOOKING", ...)` or
  `PersistenceError("CONTENTION", ...)` for those database conditions; do not
  silently convert unknown storage errors to an empty result.
- `transaction` rolls back all writes when the callback throws. Module 4
  orchestrates the business rules and bounded whole-transaction retries
  (initial attempt plus at most two contention retries), finally responding
  with `DATABASE_BUSY`. Module 2 must validate this strategy with SQLite at G3.
  A duplicate failure rolls back the reserved seat before mapping to 409.
  Business-rule failures inside the callback must also throw, not return an
  error envelope that could commit preceding writes.

For active rides, `remainingSeats = seatCapacity - activeBookingCount`;
cancelled rides have no active bookings and zero bookable seats. Module 3
initializes full capacity; Module 4 exclusively orchestrates later mutations.
No client count, unchecked read-then-write, or process-local lock replaces
database constraints/transactions. Schema/index implementation and transaction
tests are Module 2/4 prerequisites, not completed Module 1 deliverables.

Prisma dependencies and commands are wired, but `db:generate`, `db:migrate`,
and `db:seed` deliberately require Module 2's schema/seed files. They are not
no-op success scripts. From `apps/api`, Prisma resolves `DATABASE_URL` from
the shell or `.env` (Next also reads `.env.local`; Prisma does not). Module 2
should document `apps/api/.env` for shared database settings and use
`provider = "sqlite"` with `url = env("DATABASE_URL")` in its schema.
The example `file:./dev.db` is relative to the schema directory, not the
repository root. The seed command expects `apps/api/prisma/seed.ts`.
Use non-destructive repeatable seeds and explicit opt-in resets.
All `.env` files, local databases/sidecars, caches, and exports are ignored;
environment examples are tracked. Never use real employee data or secrets.

## Journeys and acceptance expectations for other owners

| Journey | Required outcome / visible state |
|---|---|
| Select demo user | List fictional names; persistent visible demo disclaimer; refresh actor-specific activity and clear stale previous-user state. |
| Offer ride | Label required city/neighborhood, departure/time zone, and 1-8 capacity inputs; errors identify fields; valid future ride starts with all seats available. |
| Discover | Optional frozen location/date filters; chronological active future results with seat counts; distinguish loading, no matches, full rides, and API errors. |
| Book | Immediate one-seat confirmation with ride, date/time zone, selected rider and booking status; no driver approval; server full/duplicate/self/cancelled/departed conflicts stay visible. |
| My activity | Offered rides and bookings with ride details/status; cancelled entries remain visible; loading/empty/error states are explicit. |
| Cancel booking | Correct selected rider; ACTIVE cancellation restores exactly one seat; repeat cancellation adds none; refresh seats/activity and allow rebooking. |
| Cancel ride | Correct selected driver; ride becomes unavailable, affected bookings cancelled atomically; reflect cancelled status for each user. |

Module 5 must use platform-appropriate navigation, readable text, sufficient
contrast (at least WCAG AA 4.5:1 for ordinary text), labelled inputs/buttons,
visible keyboard focus and complete keyboard navigation on web, and readable
screen-reader success/error/status announcements on all platforms. Target
at least 44-point touch areas and no horizontal overflow at 320px width;
keep readable content constrained on wider screens. Errors must remain
visible and loading must not allow duplicate submissions. Module 6 checks
these on available platforms rather than assuming a shared component proves it.

Module owners supply unit/endpoint checks; Module 6 verifies creation, search,
immediate/full/concurrent/duplicate booking, cancellation/rebooking/races,
cancelled/departed cases, validation, switching, SQLite persistence across
reloads, shared API connectivity, accessibility/responsiveness, and applicable
builds. Mock fixtures use `2030-06-01T12:00:00Z` as their fixed test clock;
runtime seeds must use future departures relative to execution.
`fixtures/demo.json` includes available/full/cancelled/departed rides,
active/cancelled bookings, fictional users, empty responses, and every error.
`discoveryResponse`, `bookingResponse`, `bookingCancellationResponse`,
`rideCancellationResponse`, and `activityResponse` supply validated success mocks.
Loading is an adapter/UI state, not an API payload.

## Prototype limitations

No employee sign-in, verified identity/contact details, payment, recurring
rides, notifications, maps/exact addresses, administrative tooling, production
deployment, or app-store publishing. SQLite serves one local API deployment,
not distributed/horizontally scaled instances. Use only fictional data on
trusted networks. Real data or production needs Rogers approvals, identity
controls, security/privacy review, retention, abuse handling, and operational
design. Module 6 records separate future discovery for SSO/eligibility,
privacy/location sharing, safety/support, production storage/hosting,
monitoring/accessibility, and optional excluded features; none is implemented
by this module.

## Module 1 verification evidence

Verified in this checkout with Node 26.3.0 and npm 11.16.0:

| Check | Result |
|---|---|
| `npm test` | Seven passing contract/bootstrap tests, including exact validation thresholds, calendar boundaries, fixture integrity, HTTP error shapes, and CORS headers. |
| `npm run typecheck` / `npm run lint` | All workspaces pass; Next route types are generated before type-checking so a fresh checkout does not depend on a previous build. |
| Expo dependency alignment | `expo install --check` passes after aligning React Native to the SDK's expected 0.83.10. |
| `npm run build:api` | Next production build succeeds with foundation page, health endpoint, and CORS proxy. |
| `npm run build:web` / `npm run build:mobile` | Web export and Android/iOS JavaScript/Hermes bundles succeed, including the minimal root route registration. |
| Prisma CLI | Prisma/client 6.19.3 and local macOS ARM64 engines resolve. No schema/migration/seed execution is claimed. |
| Live HTTP | Production API health GET, allowlisted GET/OPTIONS, exact CORS headers, untrusted-origin 403, and Expo HTTP readiness pass on temporary ports 3187/8187. |
| Browser shell | Root renders; clicking connectivity check shows a validated API success. Stopping the API then retrying shows a visible failure, not a stale success or silent fallback. |
| Native runtime | Not exercised: `simctl` is unavailable and `adb` is not on PATH. Native bundles are not device/simulator evidence. |

Temporary validation servers were stopped. No Spec Kit installation, feature
implementation, database generation, commit, or PR was performed. Remaining
handoff dependencies are cross-owner G1 acknowledgement, Module 2's schema/
seed/transaction implementation and Prisma wiring confirmation, then the
feature modules and Module 6's integrated platform verification.
