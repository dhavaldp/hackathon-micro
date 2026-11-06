---
name: route-matching
description: Match carpool riders to a driver's published commute route, allocate seats, and calculate distance-based fares.
---

# Route Matching Skill

Use this skill for SmartCommute matching implementation and review.

## Procedure

1. Read the driver's route as an ordered list of waypoints with cumulative distance.
2. Read each ride request's pickup and dropoff waypoints.
3. Confirm both waypoints exist on the route and pickup precedes dropoff.
4. If not, the result is NO_ROUTE_MATCH with a clear reason.
5. Confirm the rider's preferred payment method is in the driver's accepted payment list.
6. If not, the result is PAYMENT_MISMATCH with a clear reason.
7. If seats remain, allocate the request, reduce seats remaining, and calculate fare as (dropoff distance minus pickup distance) multiplied by the fare rate per kilometre.
8. If no seats remain, the result is QUEUED with the fare the rider would pay if a seat opens.
9. Process requests in submission order so earlier requests are matched first.
10. When a matched rider cancels, free their seat and promote the longest-waiting QUEUED rider whose route and payment are valid.

## Required validation

Test a fully matched trip, a request exceeding seat capacity, an off-route pickup, an off-route dropoff, an unsupported payment method, seat cancellation and promotion, and zero or negative seat counts.
