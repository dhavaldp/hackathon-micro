# SmartCommute AI Constitution

## I. Specification first
No feature begins without measurable requirements and acceptance scenarios.

## II. Deterministic core
Route matching, seat allocation, fare calculation, and cancellation promotion are deterministic code. AI may assist development and explain outcomes, but cannot silently change a match or a fare.

## III. Route safety first
A rider is never matched unless both pickup and dropoff genuinely exist on the driver's published route, in the correct order.

## IV. Capacity safety
Allocated seats must never exceed the seats the driver offered.

## V. Explainable outcomes
Every QUEUED, NO_ROUTE_MATCH, and PAYMENT_MISMATCH result must state a clear, specific reason.

## VI. Fair queueing
When a seat is freed, the longest-waiting eligible queued rider is promoted automatically.

## VII. Minimal demo scope
The product remains a local, single-screen simulation with no backend, live mapping, payment processor, or employee directory integration.
