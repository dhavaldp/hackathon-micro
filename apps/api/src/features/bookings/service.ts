import {
  ActiveBookingConflictError,
  BookingError,
  DatabaseContentionError,
  type BookingActivity,
  type BookingRepository,
  type BookingTransaction,
  type CancelledRide,
  type RideBooking,
} from "./types";

const MAX_TRANSACTION_ATTEMPTS = 3;

export interface BookingServiceOptions {
  now?: () => Date;
}

export function createBookingService(
  repository: BookingRepository,
  options: BookingServiceOptions = {},
) {
  const now = options.now ?? (() => new Date());

  return {
    bookRide(rideId: string, riderId: string): Promise<RideBooking> {
      assertIdentifier(rideId, "rideId");
      assertIdentifier(riderId, "riderId");

      return inTransaction(async (transaction) => {
        await requireUser(transaction, riderId);
        const ride = await requireRide(transaction, rideId);

        if (ride.driverId === riderId) {
          throw new BookingError("SELF_BOOKING", "Drivers cannot book their own ride.", 403);
        }
        assertBookable(ride, now());

        if (await transaction.hasActiveBooking(rideId, riderId)) {
          throw duplicateBookingError();
        }

        const reservedRide = await transaction.reserveSeatIfBookable(rideId, now());
        if (!reservedRide) {
          assertBookable(await requireRide(transaction, rideId), now());
          throw rideFullError();
        }

        try {
          const booking = await transaction.createBooking(rideId, riderId);
          return { booking, ride: reservedRide };
        } catch (error) {
          if (error instanceof ActiveBookingConflictError) {
            throw duplicateBookingError();
          }
          throw error;
        }
      });
    },

    cancelBooking(bookingId: string, riderId: string): Promise<RideBooking> {
      assertIdentifier(bookingId, "bookingId");
      assertIdentifier(riderId, "riderId");

      return inTransaction(async (transaction) => {
        await requireUser(transaction, riderId);
        const booking = await transaction.findBooking(bookingId);
        if (!booking) {
          throw notFoundError("Booking not found.");
        }
        if (booking.riderId !== riderId) {
          throw new BookingError("WRONG_ACTOR", "Only the rider can cancel this booking.", 403);
        }

        return transaction.cancelBookingAndRestoreSeat(bookingId);
      });
    },

    cancelRide(rideId: string, driverId: string): Promise<CancelledRide> {
      assertIdentifier(rideId, "rideId");
      assertIdentifier(driverId, "driverId");

      return inTransaction(async (transaction) => {
        await requireUser(transaction, driverId);
        const ride = await requireRide(transaction, rideId);
        if (ride.driverId !== driverId) {
          throw new BookingError("WRONG_ACTOR", "Only the driver can cancel this ride.", 403);
        }

        return transaction.cancelRideAndBookings(rideId);
      });
    },

    getActivity(userId: string): Promise<BookingActivity> {
      assertIdentifier(userId, "userId");
      return inTransaction(async (transaction) => {
        await requireUser(transaction, userId);
        return transaction.getActivity(userId);
      });
    },
  };

  async function inTransaction<T>(work: (transaction: BookingTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await repository.transaction(work);
      } catch (error) {
        if (error instanceof ActiveBookingConflictError) {
          throw duplicateBookingError();
        }
        if (!(error instanceof DatabaseContentionError)) {
          throw error;
        }
        if (attempt === MAX_TRANSACTION_ATTEMPTS) {
          throw new BookingError(
            "DATABASE_BUSY",
            "The database is temporarily busy. Please try again.",
            503,
          );
        }
      }
    }
    throw new Error("Unreachable transaction retry state.");
  }
}

async function requireUser(transaction: BookingTransaction, userId: string): Promise<void> {
  if (!(await transaction.userExists(userId))) {
    throw new BookingError("UNKNOWN_DEMO_USER", "Select a valid demo user.", 400);
  }
}

async function requireRide(transaction: BookingTransaction, rideId: string) {
  const ride = await transaction.findRide(rideId);
  if (!ride) {
    throw notFoundError("Ride not found.");
  }
  return ride;
}

function assertBookable(ride: Awaited<ReturnType<typeof requireRide>>, currentTime: Date): void {
  if (ride.status === "CANCELLED") {
    throw new BookingError("RIDE_CANCELLED", "This ride has been cancelled.", 409);
  }
  if (ride.departureTime <= currentTime) {
    throw new BookingError("RIDE_DEPARTED", "This ride has already departed.", 409);
  }
  if (ride.remainingSeats <= 0) {
    throw rideFullError();
  }
}

function assertIdentifier(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BookingError("INVALID_INPUT", `${field} is required.`, 400);
  }
}

function duplicateBookingError(): BookingError {
  return new BookingError("DUPLICATE_ACTIVE_BOOKING", "You already have an active booking for this ride.", 409);
}

function rideFullError(): BookingError {
  return new BookingError("RIDE_FULL", "This ride has no seats available.", 409);
}

function notFoundError(message: string): BookingError {
  return new BookingError("NOT_FOUND", message, 404);
}