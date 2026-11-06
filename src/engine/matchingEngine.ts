import type { DriverTrip, RideDecision, RideRequest } from '../domain/types';

function findWaypoint(trip: DriverTrip, waypointId: string) {
  const index = trip.route.findIndex((waypoint) => waypoint.id === waypointId);
  return index === -1 ? null : { index, waypoint: trip.route[index] };
}

function describeRouteNames(trip: DriverTrip): string {
  return trip.route.map((waypoint) => waypoint.name).join(' -> ');
}

export function evaluateRequest(
  request: RideRequest,
  trip: DriverTrip,
  seatsRemaining: number,
): RideDecision {
  const pickup = findWaypoint(trip, request.pickupWaypointId);
  const dropoff = findWaypoint(trip, request.dropoffWaypointId);

  if (!pickup || !dropoff || pickup.index >= dropoff.index) {
    return {
      requestId: request.id,
      riderName: request.riderName,
      status: 'NO_ROUTE_MATCH',
      explanation: `${request.riderName}'s pickup and dropoff are not both on ${trip.driverName}'s published route (${describeRouteNames(trip)}), so the ride cannot be matched.`,
    };
  }

  if (!trip.acceptedPayments.includes(request.preferredPayment)) {
    return {
      requestId: request.id,
      riderName: request.riderName,
      status: 'PAYMENT_MISMATCH',
      pickupName: pickup.waypoint.name,
      dropoffName: dropoff.waypoint.name,
      explanation: `${request.riderName} selected a payment method ${trip.driverName} does not accept for this trip.`,
    };
  }

  const distanceKm = dropoff.waypoint.distanceKm - pickup.waypoint.distanceKm;
  const fareCents = distanceKm * trip.farePerKmCents;

  if (request.requestedSeats <= seatsRemaining) {
    return {
      requestId: request.id,
      riderName: request.riderName,
      status: 'MATCHED',
      pickupName: pickup.waypoint.name,
      dropoffName: dropoff.waypoint.name,
      distanceKm,
      fareCents,
      explanation: `${request.riderName} was matched from ${pickup.waypoint.name} to ${dropoff.waypoint.name}, a ${distanceKm} km segment of the route.`,
    };
  }

  return {
    requestId: request.id,
    riderName: request.riderName,
    status: 'QUEUED',
    pickupName: pickup.waypoint.name,
    dropoffName: dropoff.waypoint.name,
    distanceKm,
    fareCents,
    explanation: `${request.riderName}'s route is valid, but both seats are already matched. The ride is queued at an estimated fare.`,
  };
}

export function matchRequests(requests: RideRequest[], trip: DriverTrip): RideDecision[] {
  let seatsRemaining = trip.seatsTotal;
  const decisions: RideDecision[] = [];

  for (const request of requests) {
    const decision = evaluateRequest(request, trip, seatsRemaining);
    if (decision.status === 'MATCHED') {
      seatsRemaining -= request.requestedSeats;
    }
    decisions.push(decision);
  }

  return decisions;
}

export function cancelRide(
  decisions: RideDecision[],
  requests: RideRequest[],
  trip: DriverTrip,
  requestIdToCancel: string,
): RideDecision[] {
  const cancelled = decisions.find((decision) => decision.requestId === requestIdToCancel);
  if (!cancelled || cancelled.status !== 'MATCHED') {
    return decisions;
  }

  const withoutCancelled = decisions.filter((decision) => decision.requestId !== requestIdToCancel);

  const matchedSeats = withoutCancelled
    .filter((decision) => decision.status === 'MATCHED')
    .reduce((sum, decision) => {
      const request = requests.find((item) => item.id === decision.requestId);
      return sum + (request?.requestedSeats ?? 0);
    }, 0);

  let seatsRemaining = trip.seatsTotal - matchedSeats;

  return withoutCancelled.map((decision) => {
    if (decision.status !== 'QUEUED') {
      return decision;
    }
    const request = requests.find((item) => item.id === decision.requestId);
    if (!request || request.requestedSeats > seatsRemaining) {
      return decision;
    }
    seatsRemaining -= request.requestedSeats;
    return {
      ...decision,
      status: 'MATCHED',
      explanation: `${decision.riderName} was automatically promoted from the queue after a seat was freed, matched from ${decision.pickupName} to ${decision.dropoffName}.`,
    };
  });
}
