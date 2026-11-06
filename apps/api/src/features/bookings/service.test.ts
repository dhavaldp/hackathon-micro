import assert from "node:assert/strict";
import { test } from "node:test";
import { createBookingService } from "./service";
import {
  ActiveBookingConflictError,
  BookingError,
  DatabaseContentionError,
  type Booking,
  type BookingActivity,
  type BookingRepository,
  type BookingTransaction,
  type CancelledRide,
  type Ride,
  type RideBooking,
} from "./types";

const now = new Date("2026-11-06T12:00:00.000Z");
const future = new Date("2026-11-07T12:00:00.000Z");
const driverId = "driver-1";
const riderId = "rider-1";
const otherRiderId = "rider-2";
const rideId = "ride-1";

interface FakeState {
  users: Set<string>;
  rides: Map<string, Ride>;
  bookings: Map<string, Booking>;
  nextBookingId: number;
}

function copyRide(ride: Ride): Ride {
  return { ...ride, departureTime: new Date(ride.departureTime) };
}

function copyBooking(booking: Booking): Booking {
  return { ...booking };
}

function copyState(state: FakeState): FakeState {
  return {
    users: new Set(state.users),
    rides: new Map([...state.rides].map(([id, ride]) => [id, copyRide(ride)])),
    bookings: new Map([...state.bookings].map(([id, booking]) => [id, copyBooking(booking)])),
    nextBookingId: state.nextBookingId,
  };
}

class FakeBookingRepository implements BookingRepository {
  private state: FakeState;
  contentionFailures = 0;
  transactionCalls = 0;
  conflictOnNextCreate = false;

  constructor(options: { capacity?: number; status?: Ride["status"]; departureTime?: Date } = {}) {
    const capacity = options.capacity ?? 2;
    this.state = {
      users: new Set([driverId, riderId, otherRiderId]),
      rides: new Map([[rideId, {
        id: rideId,
        driverId,
        origin: "Brampton",
        destination: "Toronto",
        departureTime: new Date(options.departureTime ?? future),
        seatCapacity: capacity,
        remainingSeats: options.status === "CANCELLED" ? 0 : capacity,
        status: options.status ?? "ACTIVE",
      }]]),
      bookings: new Map(),
      nextBookingId: 1,
    };
  }

  async transaction<T>(work: (transaction: BookingTransaction) => Promise<T>): Promise<T> {
    this.transactionCalls += 1;
    if (this.contentionFailures > 0) {
      this.contentionFailures -= 1;
      throw new DatabaseContentionError();
    }

    const before = copyState(this.state);
    try {
      return await work(this.createTransaction());
    } catch (error) {
      this.state = before;
      throw error;
    }
  }

  getRide(id = rideId): Ride {
    const ride = this.state.rides.get(id);
    assert.ok(ride);
    return copyRide(ride);
  }

  getBookings(): Booking[] {
    return [...this.state.bookings.values()].map(copyBooking);
  }

  private createTransaction(): BookingTransaction {
    return {
      userExists: async (id) => this.state.users.has(id),
      findRide: async (id) => {
        const ride = this.state.rides.get(id);
        return ride ? copyRide(ride) : null;
      },
      hasActiveBooking: async (id, rider) => [...this.state.bookings.values()].some(
        (booking) => booking.rideId === id && booking.riderId === rider && booking.status === "ACTIVE",
      ),
      reserveSeatIfBookable: async (id, at) => {
        const ride = this.state.rides.get(id);
        if (!ride || ride.status !== "ACTIVE" || ride.departureTime <= at || ride.remainingSeats < 1) return null;
        ride.remainingSeats -= 1;
        return copyRide(ride);
      },
      createBooking: async (id, rider) => {
        if (this.conflictOnNextCreate) {
          this.conflictOnNextCreate = false;
          throw new ActiveBookingConflictError();
        }
        if ([...this.state.bookings.values()].some(
          (booking) => booking.rideId === id && booking.riderId === rider && booking.status === "ACTIVE",
        )) {
          throw new ActiveBookingConflictError();
        }
        const booking: Booking = {
          id: `booking-${this.state.nextBookingId++}`,
          rideId: id,
          riderId: rider,
          status: "ACTIVE",
        };
        this.state.bookings.set(booking.id, booking);
        return copyBooking(booking);
      },
      findBooking: async (id) => {
        const booking = this.state.bookings.get(id);
        return booking ? copyBooking(booking) : null;
      },
      cancelBookingAndRestoreSeat: async (id) => {
        const booking = this.state.bookings.get(id);
        assert.ok(booking);
        const ride = this.state.rides.get(booking.rideId);
        assert.ok(ride);
        if (booking.status === "ACTIVE") {
          booking.status = "CANCELLED";
          if (ride.status === "ACTIVE") ride.remainingSeats = Math.min(ride.seatCapacity, ride.remainingSeats + 1);
        }
        return { booking: copyBooking(booking), ride: copyRide(ride) };
      },
      cancelRideAndBookings: async (id): Promise<CancelledRide> => {
        const ride = this.state.rides.get(id);
        assert.ok(ride);
        const cancelledBookingIds: string[] = [];
        if (ride.status !== "CANCELLED") {
          ride.status = "CANCELLED";
          ride.remainingSeats = 0;
          for (const booking of this.state.bookings.values()) {
            if (booking.rideId === id && booking.status === "ACTIVE") {
              booking.status = "CANCELLED";
              cancelledBookingIds.push(booking.id);
            }
          }
        }
        return { ride: copyRide(ride), cancelledBookingIds };
      },
      getActivity: async (userId): Promise<BookingActivity> => ({
        offeredRides: [...this.state.rides.values()]
          .filter((ride) => ride.driverId === userId)
          .map(copyRide),
        bookings: [...this.state.bookings.values()]
          .filter((booking) => booking.riderId === userId)
          .map((booking): RideBooking => {
            const ride = this.state.rides.get(booking.rideId);
            assert.ok(ride);
            return { booking: copyBooking(booking), ride: copyRide(ride) };
          }),
      }),
    };
  }
}

function createService(repository = new FakeBookingRepository()) {
  return { repository, service: createBookingService(repository, { now: () => new Date(now) }) };
}

async function rejectsWithCode(operation: Promise<unknown>, code: BookingError["code"], status: number) {
  await assert.rejects(operation, (error: unknown) =>
    error instanceof BookingError && error.code === code && error.status === status,
  );
}

test("booking reserves exactly one seat and rejects a duplicate without changing capacity", async () => {
  const { repository, service } = createService();
  const result = await service.bookRide(rideId, riderId);
  assert.equal(result.booking.status, "ACTIVE");
  assert.equal(result.ride.remainingSeats, 1);
  await rejectsWithCode(service.bookRide(rideId, riderId), "DUPLICATE_ACTIVE_BOOKING", 409);
  assert.equal(repository.getRide().remainingSeats, 1);
});

test("booking rejects unknown users, missing rides, and self-booking", async () => {
  const { service } = createService();
  await rejectsWithCode(service.bookRide(rideId, "unknown-user"), "UNKNOWN_DEMO_USER", 400);
  await rejectsWithCode(service.bookRide("missing-ride", riderId), "NOT_FOUND", 404);
  await rejectsWithCode(service.bookRide(rideId, driverId), "SELF_BOOKING", 403);
});

test("booking rejects full, cancelled, and departed rides", async () => {
  const full = new FakeBookingRepository({ capacity: 0 });
  await rejectsWithCode(createBookingService(full, { now: () => now }).bookRide(rideId, riderId), "RIDE_FULL", 409);

  const cancelled = new FakeBookingRepository({ status: "CANCELLED" });
  await rejectsWithCode(createBookingService(cancelled, { now: () => now }).bookRide(rideId, riderId), "RIDE_CANCELLED", 409);

  const departed = new FakeBookingRepository({ departureTime: new Date(now.getTime() - 1) });
  await rejectsWithCode(createBookingService(departed, { now: () => now }).bookRide(rideId, riderId), "RIDE_DEPARTED", 409);
});

test("a database uniqueness conflict rolls back the seat reservation", async () => {
  const repository = new FakeBookingRepository();
  repository.conflictOnNextCreate = true;
  await rejectsWithCode(
    createBookingService(repository, { now: () => now }).bookRide(rideId, riderId),
    "DUPLICATE_ACTIVE_BOOKING",
    409,
  );
  assert.equal(repository.getRide().remainingSeats, 2);
  assert.deepEqual(repository.getBookings(), []);
});

test("rider cancellation restores one seat exactly once and allows rebooking", async () => {
  const { repository, service } = createService();
  const first = await service.bookRide(rideId, riderId);
  const cancelled = await service.cancelBooking(first.booking.id, riderId);
  assert.equal(cancelled.booking.status, "CANCELLED");
  assert.equal(cancelled.ride.remainingSeats, 2);

  const repeated = await service.cancelBooking(first.booking.id, riderId);
  assert.equal(repeated.ride.remainingSeats, 2);
  assert.equal(repository.getRide().remainingSeats, 2);

  const rebooked = await service.bookRide(rideId, riderId);
  assert.equal(rebooked.booking.status, "ACTIVE");
  assert.equal(rebooked.ride.remainingSeats, 1);
});

test("only the booking rider and ride driver may cancel", async () => {
  const { service } = createService();
  const booked = await service.bookRide(rideId, riderId);
  await rejectsWithCode(service.cancelBooking(booked.booking.id, otherRiderId), "WRONG_ACTOR", 403);
  await rejectsWithCode(service.cancelRide(rideId, otherRiderId), "WRONG_ACTOR", 403);
});

test("driver cancellation marks active bookings cancelled and blocks later booking", async () => {
  const { repository, service } = createService();
  const booked = await service.bookRide(rideId, riderId);
  const cancelled = await service.cancelRide(rideId, driverId);
  assert.deepEqual(cancelled.cancelledBookingIds, [booked.booking.id]);
  assert.equal(cancelled.ride.status, "CANCELLED");
  assert.equal(cancelled.ride.remainingSeats, 0);

  const repeated = await service.cancelRide(rideId, driverId);
  assert.deepEqual(repeated.cancelledBookingIds, []);
  await rejectsWithCode(service.bookRide(rideId, otherRiderId), "RIDE_CANCELLED", 409);
  assert.equal(repository.getBookings()[0].status, "CANCELLED");
});

test("activity returns the selected user's offered rides and bookings", async () => {
  const { service } = createService();
  const booking = await service.bookRide(rideId, riderId);
  const riderActivity = await service.getActivity(riderId);
  const driverActivity = await service.getActivity(driverId);
  assert.equal(riderActivity.bookings[0].booking.id, booking.booking.id);
  assert.equal(riderActivity.offeredRides.length, 0);
  assert.equal(driverActivity.offeredRides[0].id, rideId);
  assert.equal(driverActivity.bookings.length, 0);
});

test("transient contention retries the whole service transaction", async () => {
  const repository = new FakeBookingRepository();
  repository.contentionFailures = 2;
  const result = await createBookingService(repository, { now: () => now }).bookRide(rideId, riderId);
  assert.equal(result.ride.remainingSeats, 1);
  assert.equal(repository.transactionCalls, 3);
});

test("exhausted contention maps to a retryable database-busy error", async () => {
  const repository = new FakeBookingRepository();
  repository.contentionFailures = 3;
  await rejectsWithCode(
    createBookingService(repository, { now: () => now }).bookRide(rideId, riderId),
    "DATABASE_BUSY",
    503,
  );
  assert.equal(repository.transactionCalls, 3);
  assert.equal(repository.getRide().remainingSeats, 2);
});
