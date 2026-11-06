---
name: ride-validation
description: Trace SmartCommute matching results and tests to specification requirements for route safety, seat limits, fares, and payments.
---

# Ride Validation Skill

1. Read the active specification and acceptance criteria.
2. Verify every MATCHED rider's pickup and dropoff are both on the route and in order.
3. Verify total allocated seats never exceed the driver's offered seats.
4. Recalculate each fare independently from route distance and fare rate.
5. Verify every PAYMENT_MISMATCH case actually uses an unsupported payment method.
6. Verify every QUEUED rider has no seat only because capacity was exhausted, not because of a route problem.
7. Verify cancellation frees exactly one seat and promotes the correct queued rider.
8. Report requirement ID, implementation evidence, test evidence, and verdict.
9. Do not invent new requirements.
