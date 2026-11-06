import type { DriverTrip, RideRequest } from '../domain/types';

export const route = [
  { id: 'brampton', name: 'Brampton GO Station', distanceKm: 0 },
  { id: 'mississauga', name: 'Mississauga City Centre', distanceKm: 18 },
  { id: 'pearson', name: 'Pearson Airport', distanceKm: 26 },
  { id: 'downtown', name: 'CIBC Square, Downtown Toronto', distanceKm: 40 },
];

export const driverTrip: DriverTrip = {
  id: 'trip-alex',
  driverName: 'Alex',
  departureTime: '8:00 AM',
  seatsTotal: 2,
  farePerKmCents: 20,
  route,
  acceptedPayments: ['E_TRANSFER', 'CASH', 'PAYROLL_DEDUCTION'],
};

export const demoRequests: RideRequest[] = [
  {
    id: 'priya',
    riderName: 'Priya',
    pickupWaypointId: 'mississauga',
    dropoffWaypointId: 'downtown',
    requestedSeats: 1,
    preferredPayment: 'E_TRANSFER',
  },
  {
    id: 'omar',
    riderName: 'Omar',
    pickupWaypointId: 'pearson',
    dropoffWaypointId: 'downtown',
    requestedSeats: 1,
    preferredPayment: 'CASH',
  },
  {
    id: 'sara',
    riderName: 'Sara',
    pickupWaypointId: 'brampton',
    dropoffWaypointId: 'downtown',
    requestedSeats: 1,
    preferredPayment: 'PAYROLL_DEDUCTION',
  },
  {
    id: 'jordan',
    riderName: 'Jordan',
    pickupWaypointId: 'hamilton',
    dropoffWaypointId: 'downtown',
    requestedSeats: 1,
    preferredPayment: 'E_TRANSFER',
  },
];
