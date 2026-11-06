# Implementation Plan

## Technical approach
Build a single React + TypeScript + Vite screen. Store a synthetic route, one driver trip, and four ride requests in code. Use a pure matching engine to validate route order, enforce seat capacity, validate payment compatibility, calculate fares, and promote queued riders after a cancellation.

## Components

1. Domain types for waypoints, driver trips, ride requests, and ride decisions.
2. Synthetic Brampton-to-Downtown route and four demo ride requests.
3. Pure matching engine: route validation, payment validation, seat allocation, fare calculation.
4. Pure cancellation function that frees a seat and promotes the next eligible queued rider.
5. One dashboard showing the trip, requests, results, and an explanation panel.
6. Vitest unit tests mapped to acceptance scenarios.

## Design constraints

- No backend, database, or external APIs.
- No live mapping or payment service calls.
- No business logic inside React.
- Fares use integer cents.
- Status must not rely on colour alone.
- Responsive at 320px and desktop widths.

## Verification

- `npm test`
- `npm run build`
- Manual demonstration of AC-001, AC-003, and AC-005.
