import { z } from "zod";

export const CONTRACT_VERSION = "1.0.0";
export const DEMO_USER_HEADER = "X-Demo-User-Id";
export const INPUT_LIMITS = { locationLength: 100, seatCapacity: 8 } as const;
export const idSchema = z.string().trim().min(1).max(100);
export const locationSchema = z.string().trim().min(1).max(INPUT_LIMITS.locationLength);
export const instantSchema = z.iso.datetime({ offset: true });
export const rideStatusSchema = z.enum(["ACTIVE", "CANCELLED"]);
export const bookingStatusSchema = z.enum(["ACTIVE", "CANCELLED"]);

export const demoUserSchema = z.object({
  id: idSchema,
  displayName: z.string().min(1),
  contactDetails: z.string().optional(),
});
export const rideSchema = z.object({
  id: idSchema,
  driverId: idSchema,
  origin: locationSchema,
  destination: locationSchema,
  departureTime: instantSchema,
  seatCapacity: z.number().int().min(1).max(INPUT_LIMITS.seatCapacity),
  remainingSeats: z.number().int().min(0),
  status: rideStatusSchema,
}).refine((ride) => ride.remainingSeats <= ride.seatCapacity, {
  path: ["remainingSeats"], message: "Remaining seats cannot exceed capacity.",
}).refine((ride) => ride.status !== "CANCELLED" || ride.remainingSeats === 0, {
  path: ["remainingSeats"], message: "Cancelled rides have no bookable seats.",
});
export const bookingSchema = z.object({
  id: idSchema,
  rideId: idSchema,
  riderId: idSchema,
  status: bookingStatusSchema,
});
export const createRideSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  departureTime: instantSchema,
  seatCapacity: z.number().int().min(1).max(INPUT_LIMITS.seatCapacity),
}).strict();
export function createRideSchemaAt(now: Date) {
  return createRideSchema.refine(
    (ride) => Date.parse(ride.departureTime) > now.getTime(),
    { path: ["departureTime"], message: "Departure must be in the future." },
  );
}
export const discoveryQuerySchema = z.object({
  origin: locationSchema.optional(),
  destination: locationSchema.optional(),
  date: z.iso.date().optional(),
}).strict();
export function utcDateRange(date: string): { start: string; end: string } {
  const day = z.iso.date().parse(date);
  const start = new Date(`${day}T00:00:00.000Z`);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 86_400_000).toISOString(),
  };
}

export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  DEMO_USER_REQUIRED: 400,
  DEMO_USER_NOT_FOUND: 400,
  NOT_FOUND: 404,
  WRONG_ACTOR: 403,
  ORIGIN_NOT_ALLOWED: 403,
  SELF_BOOKING: 403,
  DUPLICATE_BOOKING: 409,
  RIDE_FULL: 409,
  RIDE_CANCELLED: 409,
  RIDE_DEPARTED: 409,
  DATABASE_BUSY: 503,
  INTERNAL_ERROR: 500,
} as const;
export type ErrorCode = keyof typeof ERROR_STATUS;
export const errorCodeSchema = z.enum(Object.keys(ERROR_STATUS) as [ErrorCode, ...ErrorCode[]]);
export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string().min(1),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
});
export function successSchema<T extends z.ZodType>(data: T) {
  return z.object({ data });
}
export const bookingWithRideSchema = bookingSchema.extend({ ride: rideSchema })
  .refine((booking) => booking.rideId === booking.ride.id, {
    path: ["rideId"], message: "Booking and ride IDs must match.",
  });
export const activitySchema = z.object({
  offeredRides: z.array(rideSchema),
  bookings: z.array(bookingWithRideSchema),
});
export const bookingMutationSchema = z.object({ booking: bookingSchema, ride: rideSchema })
  .refine((data) => data.booking.rideId === data.ride.id);
export const rideCancellationSchema = z.object({
  ride: rideSchema,
  cancelledBookingIds: z.array(idSchema),
});
export const healthSchema = z.object({
  status: z.literal("ok"),
  contractVersion: z.literal(CONTRACT_VERSION),
  scope: z.literal("foundation-only"),
});
export type DemoUser = z.infer<typeof demoUserSchema>;
export type Ride = z.infer<typeof rideSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type CreateRideRequest = z.infer<typeof createRideSchema>;
export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;
export type Activity = z.infer<typeof activitySchema>;
export type BookingMutation = z.infer<typeof bookingMutationSchema>;
export type RideCancellation = z.infer<typeof rideCancellationSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiSuccess<T> = { data: T };
export type ApiResult<T> = ApiSuccess<T> | ApiError;
export type Health = z.infer<typeof healthSchema>;

export const API_PATHS = {
  health: "/api/health",
  demoUsers: "/api/demo-users",
  rides: "/api/rides",
  activity: "/api/me/activity",
  book: (rideId: string) => `/api/rides/${encodeURIComponent(rideId)}/bookings`,
  cancelBooking: (bookingId: string) => `/api/bookings/${encodeURIComponent(bookingId)}/cancel`,
  cancelRide: (rideId: string) => `/api/rides/${encodeURIComponent(rideId)}/cancel`,
} as const;

export interface DemoUserRepository {
  list(): Promise<DemoUser[]>;
  findById(id: string): Promise<DemoUser | null>;
}
export interface RideRepository {
  create(driverId: string, input: CreateRideRequest): Promise<Ride>;
  listUpcoming(query: DiscoveryQuery, now: Date): Promise<Ride[]>;
}
export interface ActivityRepository {
  forUser(userId: string): Promise<Activity>;
}

// Only Module 4 orchestrates capacity mutations; Module 2 implements this boundary.
export interface BookingTransaction {
  findRide(id: string): Promise<Ride | null>;
  findBooking(id: string): Promise<Booking | null>;
  findActiveBooking(rideId: string, riderId: string): Promise<Booking | null>;
  reserveSeat(rideId: string, now: Date): Promise<boolean>;
  insertBooking(rideId: string, riderId: string): Promise<Booking>;
  cancelActiveBooking(id: string): Promise<boolean>;
  restoreSeat(rideId: string): Promise<void>;
  cancelRideAndBookings(rideId: string): Promise<RideCancellation>;
}
export interface BookingRepository {
  transaction<T>(operation: (tx: BookingTransaction) => Promise<T>): Promise<T>;
}
export type PersistenceFailureCode = "DUPLICATE_ACTIVE_BOOKING" | "CONTENTION";
export class PersistenceError extends Error {
  constructor(public readonly code: PersistenceFailureCode, message: string) {
    super(message);
    this.name = "PersistenceError";
  }
}
