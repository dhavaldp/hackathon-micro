import { PersistenceError, type ActivityRepository, type BookingRepository, type BookingTransaction, type DemoUserRepository } from "@carpool/contracts";
import { BookingError } from "./types";

const MAX_TRANSACTION_ATTEMPTS = 3;

export function createBookingService(
  repository: BookingRepository,
  users: DemoUserRepository,
  activity: ActivityRepository,
  now: () => Date = () => new Date(),
) {
  async function requireUser(userId: string) {
    if (!await users.findById(userId)) {
      throw new BookingError("DEMO_USER_NOT_FOUND", "Select a valid demo user.", 400);
    }
  }

  async function inTransaction<T>(work: (tx: BookingTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
      try {
        return await repository.transaction(work);
      } catch (error) {
        if (!(error instanceof PersistenceError)) throw error;
        if (error.code === "DUPLICATE_ACTIVE_BOOKING") {
          throw new BookingError("DUPLICATE_BOOKING", "You already have an active booking for this ride.", 409);
        }
        if (error.code !== "CONTENTION") throw error;
        if (attempt === MAX_TRANSACTION_ATTEMPTS) {
          throw new BookingError("DATABASE_BUSY", "The database is temporarily busy. Please try again.", 503);
        }
        await new Promise((resolve) => setTimeout(resolve, 20 * attempt));
      }
    }
    throw new Error("Unreachable transaction retry state.");
  }

  async function requireRide(tx: BookingTransaction, id: string) {
    const ride = await tx.findRide(id);
    if (!ride) throw new BookingError("NOT_FOUND", "Ride not found.", 404);
    return ride;
  }

  return {
    async bookRide(rideId: string, riderId: string) {
      await requireUser(riderId);
      return inTransaction(async (tx) => {
        const ride = await requireRide(tx, rideId);
        if (ride.driverId === riderId) throw new BookingError("SELF_BOOKING", "Drivers cannot book their own ride.", 403);
        if (ride.status === "CANCELLED") throw new BookingError("RIDE_CANCELLED", "This ride has been cancelled.", 409);
        if (Date.parse(ride.departureTime) <= now().getTime()) throw new BookingError("RIDE_DEPARTED", "This ride has already departed.", 409);
        if (await tx.findActiveBooking(rideId, riderId)) {
          throw new BookingError("DUPLICATE_BOOKING", "You already have an active booking for this ride.", 409);
        }
        if (!await tx.reserveSeat(rideId, now())) {
          const current = await requireRide(tx, rideId);
          if (current.status === "CANCELLED") throw new BookingError("RIDE_CANCELLED", "This ride has been cancelled.", 409);
          if (Date.parse(current.departureTime) <= now().getTime()) throw new BookingError("RIDE_DEPARTED", "This ride has already departed.", 409);
          throw new BookingError("RIDE_FULL", "This ride has no seats available.", 409);
        }
        const booking = await tx.insertBooking(rideId, riderId);
        return { booking, ride: await requireRide(tx, rideId) };
      });
    },
    async cancelBooking(bookingId: string, riderId: string) {
      await requireUser(riderId);
      return inTransaction(async (tx) => {
        const booking = await tx.findBooking(bookingId);
        if (!booking) throw new BookingError("NOT_FOUND", "Booking not found.", 404);
        if (booking.riderId !== riderId) throw new BookingError("WRONG_ACTOR", "Only the rider can cancel this booking.", 403);
        const changed = await tx.cancelActiveBooking(bookingId);
        const ride = await requireRide(tx, booking.rideId);
        if (changed && ride.status === "ACTIVE") await tx.restoreSeat(ride.id);
        return { booking: { ...booking, status: "CANCELLED" as const }, ride: await requireRide(tx, ride.id) };
      });
    },
    async cancelRide(rideId: string, driverId: string) {
      await requireUser(driverId);
      return inTransaction(async (tx) => {
        const ride = await requireRide(tx, rideId);
        if (ride.driverId !== driverId) throw new BookingError("WRONG_ACTOR", "Only the driver can cancel this ride.", 403);
        return tx.cancelRideAndBookings(rideId);
      });
    },
    async getActivity(userId: string) {
      await requireUser(userId);
      return activity.forUser(userId);
    },
  };
}
