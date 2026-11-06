# Feature Specification: Smart Commute Matching

## Problem
Employees commute along overlapping corridors every day, but manually coordinating carpools is difficult: drivers need to know who to pick up and drop off along their existing route, riders need a fair price, and seats need to be reassigned quickly when plans change.

## User story
As a Rogers employee who drives to the office, I want to publish my commute route and available seats so that nearby colleagues can be automatically matched to ride along, charged a fair distance-based fare, and reassigned fairly if a matched rider cancels.

## Demo scenario

- Driver: Alex
- Route: Brampton GO Station (0 km), Mississauga City Centre (18 km), Pearson Airport (26 km), CIBC Square Downtown Toronto (40 km)
- Seats offered: 2
- Fare rate: CAD $0.20 per kilometre
- Accepted payments: Interac e-Transfer, Cash, Payroll Deduction

### Ride requests, in submission order

1. Priya: pickup Mississauga City Centre, dropoff CIBC Square, payment e-Transfer
2. Omar: pickup Pearson Airport, dropoff CIBC Square, payment Cash
3. Sara: pickup Brampton GO Station, dropoff CIBC Square, payment Payroll Deduction
4. Jordan: pickup Hamilton GO Station (not on the route), dropoff CIBC Square, payment e-Transfer

## Functional requirements

- **FR-001** Display the driver's route, departure time, seats offered, fare rate, and accepted payment methods.
- **FR-002** A ride request shall include rider name, pickup waypoint, dropoff waypoint, requested seats, and preferred payment method.
- **FR-003** A rider shall be matched only if both pickup and dropoff exist on the route and pickup precedes dropoff.
- **FR-004** A rider whose pickup or dropoff is not on the route shall receive NO_ROUTE_MATCH with a specific reason.
- **FR-005** A rider whose preferred payment method is not accepted by the driver shall receive PAYMENT_MISMATCH with a specific reason, even if a seat is available.
- **FR-006** Fare shall equal the route distance between pickup and dropoff multiplied by the fare rate, calculated in integer cents.
- **FR-007** Requests shall be matched in submission order until seats are exhausted.
- **FR-008** A valid request that cannot be seated shall receive QUEUED with its estimated fare.
- **FR-009** Total matched seats shall never exceed the seats the driver offered.
- **FR-010** When a matched rider cancels, their seat shall be freed and the longest-waiting eligible queued rider shall be promoted automatically.

## Acceptance scenarios

### AC-001 Matched riders
Given the demo scenario, when matching runs, then Priya is MATCHED for CAD $4.40 and Omar is MATCHED for CAD $2.80.

### AC-002 Seat exhaustion
Given both seats are already matched, when Sara's request is evaluated, then she is QUEUED with an estimated fare of CAD $8.00.

### AC-003 Off-route rejection
Given Jordan's pickup is Hamilton GO Station, when matching runs, then his request is NO_ROUTE_MATCH and the reason references the route.

### AC-004 Seat invariant
For any valid set of requests, total matched seats never exceed the seats the driver offered.

### AC-005 Cancellation and promotion
Given Omar cancels his matched ride, when the seat is reclaimed, then Sara is automatically promoted to MATCHED at CAD $8.00.

### AC-006 Payment mismatch
Given a rider requests a payment method the driver does not accept, when matching runs, then the result is PAYMENT_MISMATCH even if a seat would otherwise be available.

## Out of scope
Live mapping or traffic data, real payment processing, employee directory integration, ride-in-progress tracking, driver ratings, and multi-driver route optimization.
