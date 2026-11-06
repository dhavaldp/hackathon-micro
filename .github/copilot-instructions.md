# Copilot Instructions for SmartCommute AI

SmartCommute AI is a specification-driven React and TypeScript hackathon demonstration of employee carpool matching.

Before coding, read `AGENTS.md` and the active feature specification.

- Treat the specification as the source of truth.
- Keep route matching, seat allocation, fare calculation, and payment validation outside React components.
- Do not add a backend, database, authentication, live mapping API, or payment processor.
- Use synthetic route, trip, and rider data only.
- Preserve the Brampton to Downtown Toronto demo route unless the specification changes.
- Never match a rider whose pickup or dropoff is not on the driver's route.
- Never allocate more seats than the driver offered.
- Always explain QUEUED, NO_ROUTE_MATCH, and PAYMENT_MISMATCH outcomes.
- When a seat is freed, promote the next queued rider automatically.
- Use strict TypeScript and never use `any`.
- Run tests after matching-rule changes.
- State the acceptance criterion satisfied by each change.
