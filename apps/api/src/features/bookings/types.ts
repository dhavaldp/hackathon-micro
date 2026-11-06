export type RideStatus = "ACTIVE" | "CANCELLED";
export type BookingStatus = "ACTIVE" | "CANCELLED";

export interface Ride {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  departureTime: Date;
  seatCapacity: number;
  remainingSeats: number;
  status: RideStatus;
}

export interface Booking {
  id: string;
  rideId: string;
  riderId: string;
  status: BookingStatus;
}

export interface RideBooking {
  booking: Booking;
  ride: Ride;
}

export interface CancelledRide {
  ride: Ride;
  cancelledBookingIds: string[];
}

export interface BookingActivity {
  offeredRides: Ride[];
  bookings: RideBooking[];
}

export interface BookingTransaction {
  userExists(userId: string): Promise<boolean>;
  findRide(rideId: string): Promise<Ride | null>;
  hasActiveBooking(rideId: string, riderId: string): Promise<boolean>;
  reserveSeatIfBookable(rideId: string, now: Date): Promise<Ride | null>;
  createBooking(rideId: string, riderId: string): Promise<Booking>;
  findBooking(bookingId: string): Promise<Booking | null>;
  cancelBookingAndRestoreSeat(bookingId: string): Promise<RideBooking>;
  cancelRideAndBookings(rideId: string): Promise<CancelledRide>;
  getActivity(userId: string): Promise<BookingActivity>;
}

export interface BookingRepository {
  transaction<T>(work: (transaction: BookingTransaction) => Promise<T>): Promise<T>;
}

export type BookingErrorCode =
  | "INVALID_INPUT"
  | "UNKNOWN_DEMO_USER"
  | "NOT_FOUND"
  | "WRONG_ACTOR"
  | "SELF_BOOKING"
  | "DUPLICATE_ACTIVE_BOOKING"
  | "RIDE_FULL"
  | "RIDE_CANCELLED"
  | "RIDE_DEPARTED"
  | "DATABASE_BUSY";

export class BookingError extends Error {
  constructor(
    readonly code: BookingErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export class DatabaseContentionError extends Error {
  constructor() {
    super("The database is temporarily busy.");
    this.name = "DatabaseContentionError";
  }
}

export class ActiveBookingConflictError extends Error {
  constructor() {
    super("An active booking already exists for this rider and ride.");
    this.name = "ActiveBookingConflictError";
  }
}