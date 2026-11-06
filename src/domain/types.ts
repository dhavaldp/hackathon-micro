export type PaymentMethod = 'CASH' | 'E_TRANSFER' | 'PAYROLL_DEDUCTION';

export type RideStatus = 'MATCHED' | 'QUEUED' | 'NO_ROUTE_MATCH' | 'PAYMENT_MISMATCH';

export interface Waypoint {
  id: string;
  name: string;
  distanceKm: number;
}

export interface DriverTrip {
  id: string;
  driverName: string;
  departureTime: string;
  seatsTotal: number;
  farePerKmCents: number;
  route: Waypoint[];
  acceptedPayments: PaymentMethod[];
}

export interface RideRequest {
  id: string;
  riderName: string;
  pickupWaypointId: string;
  dropoffWaypointId: string;
  requestedSeats: number;
  preferredPayment: PaymentMethod;
}

export interface RideDecision {
  requestId: string;
  riderName: string;
  status: RideStatus;
  pickupName?: string;
  dropoffName?: string;
  distanceKm?: number;
  fareCents?: number;
  explanation: string;
}
