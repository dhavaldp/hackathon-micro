# SQLite persistence handoff

Module 2 exposes `demoUsers`, `rides`, `activity`, `bookings`, and the shared
`prisma` client from `apps/api/src/db`. The repository types come from
`@carpool/contracts`; API features must use the repositories and must not
instantiate another Prisma client.

## Setup

Use Node 22.13 or newer. Copy `apps/api/.env.example` to `apps/api/.env`.
Prisma reads `.env`, not `.env.local`; `DATABASE_URL=file:./dev.db` points
to `apps/api/prisma/dev.db`. From the repository root run:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
```

The seed inserts fictional users and rides with stable IDs, including available,
full, cancelled, and departed examples. It creates each sample ride and its
bookings only when the ride is missing, never overwriting existing records or
adjusting existing dates. Repeated seeding therefore preserves user changes;
old sample rides do not automatically become upcoming again.

An explicit destructive reset is available with
`npm exec --workspace @carpool/api -- prisma migrate reset`. This deletes all
data in the configured database and reruns migrations and seed; use only for
an intentionally disposable database. Do not use real employee information.

## Isolated checks

Set `DATABASE_URL` to an absolute `file:` URL for a disposable database, then
run `npm run db:migrate`, `npm run db:seed`, and
`npx tsx --test apps/api/src/db/*.test.ts`. Tests create and clean up their own
records and temporarily modify one seeded user in that database; never point
them at a database containing wanted data. The contention test uses Node's
experimental built-in SQLite module to hold a separate process's write lock.
SQLite databases and sidecars must not be committed.

## Transaction contract

`bookings.transaction` uses one interactive transaction client and rolls back
when the callback throws. Module 4 owns actor, self-booking, ride state, and
departure checks, sequencing seat reservations and booking changes, and
retrying the *whole* transaction on `PersistenceError("CONTENTION")` at most
twice after the initial attempt. A duplicate active insert raises
`PersistenceError("DUPLICATE_ACTIVE_BOOKING")`; catching it outside the
transaction ensures a preceding reservation rolls back. Never catch and return
business errors within a callback after writes.

The migration enforces foreign keys, status/capacity bounds, and a partial
unique index for active bookings. Counts spanning tables cannot be represented
by SQLite CHECK constraints: preserving `remainingSeats = seatCapacity - active
bookings` requires the documented transaction sequences. A booking cancellation
restores a seat only when `cancelActiveBooking` returns true. Cancelling a ride
cancels active bookings and zeros its bookable seats in the same transaction.
SQLite is intended for one local API deployment, not horizontally scaled use.
