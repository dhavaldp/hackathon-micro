# SmartCommute AI Agent Guide

## Source of truth

1. Read `.specify/memory/constitution.md`.
2. Read `specs/001-smart-commute-matching/spec.md`.
3. Read the implementation plan and tasks.
4. Implement only an existing task.

## Architecture

- `src/domain/types.ts`: route, trip, request, and decision contracts.
- `src/data/demoCommute.ts`: synthetic route, driver trip, and ride requests.
- `src/engine/matchingEngine.ts`: all route matching, seat allocation, fare, and cancellation logic.
- `src/App.tsx`: presentation and interaction only.
- UI code must not recalculate matches, fares, or seat counts.

## Non-negotiable rules

- A rider can only be matched if both pickup and dropoff exist on the driver's route, in order.
- Seats allocated must never exceed seats offered.
- Fare is distance along the route multiplied by the fare rate, in integer cents.
- A request with an unsupported payment method must be flagged, not silently matched.
- When a seat is freed, the longest-waiting queued rider is promoted automatically.
- Use synthetic data only.
- Use strict TypeScript and never use `any`.
- Every matching rule requires a unit test.

## Completion evidence

After a change:

1. State the task ID completed.
2. Run `npm test`.
3. Run `npm run build`.
4. List changed files.
5. Map the result to an acceptance criterion.
