import {
  createRideSchemaAt,
  discoveryQuerySchema,
  utcDateRange,
  type Activity,
  type Booking,
  type BookingMutation,
  type CreateRideRequest,
  type DemoUser,
  type DiscoveryQuery,
  type Ride,
  type RideCancellation,
} from "@carpool/contracts";
import { fixtures } from "@carpool/contracts/fixtures";
import { CarpoolApiError, type CarpoolApi } from "./api";

function makeError(
  code: ConstructorParameters<typeof CarpoolApiError>[0]["code"],
  message: string,
  fieldErrors?: Record<string, string[]>,
): CarpoolApiError {
  return new CarpoolApiError({ code, message, ...(fieldErrors ? { fieldErrors } : {}) });
}

function freshRides(now: Date): Ride[] {
  const firstDeparture = new Date(now);
  firstDeparture.setUTCDate(firstDeparture.getUTCDate() + 1);
  firstDeparture.setUTCHours(14, 0, 0, 0);

  return fixtures.rides.map((ride, index) => {
    const departure = new Date(firstDeparture);
    if (index === 1) departure.setUTCHours(departure.getUTCHours() + 1);
    if (index === 2) departure.setUTCDate(departure.getUTCDate() + 1);
    if (index === 3) departure.setTime(now.getTime() - 86_400_000);
    return { ...ride, departureTime: departure.toISOString() };
  });
}

export function createMockCarpoolApi(clock: () => Date = () => new Date()): CarpoolApi {
  const users: DemoUser[] = fixtures.users.map((user) => ({ ...user }));
  let rides = freshRides(clock());
  let bookings: Booking[] = fixtures.bookings.map((booking) => ({ ...booking }));
  let nextId = 0;

  function userFor(actorId: string): DemoUser {
    const user = users.find(({ id }) => id === actorId);
    if (!user) throw makeError("DEMO_USER_NOT_FOUND", "Select an available demo user.");
    return user;
  }

  function rideFor(rideId: string): Ride {
    const ride = rides.find(({ id }) => id === rideId);
    if (!ride) throw makeError("NOT_FOUND", "Ride not found.");
    return ride;
  }

  function setRide(updated: Ride): void {
    rides = rides.map((ride) => ride.id === updated.id ? updated : ride);
  }

  function newId(prefix: string): string {
    nextId += 1;
    return `mock-${prefix}-${Date.now()}-${nextId}`;
  }

  function checkFutureRide(ride: Ride, now: Date): void {
    if (ride.status === "CANCELLED") throw makeError("RIDE_CANCELLED", "This ride was cancelled.");
    if (Date.parse(ride.departureTime) <= now.getTime()) {
      throw makeError("RIDE_DEPARTED", "This ride has departed.");
    }
  }

  return {
    async listUsers() {
      return users.map((user) => ({ ...user }));
    },

    async listRides(query: DiscoveryQuery = {}) {
      const filters = discoveryQuerySchema.parse(query);
      const now = clock();
      const range = filters.date ? utcDateRange(filters.date) : undefined;
      return rides
        .filter((ride) =>
          ride.status === "ACTIVE"
          && Date.parse(ride.departureTime) > now.getTime()
          && (!filters.origin || ride.origin.toLocaleLowerCase().includes(filters.origin.toLocaleLowerCase()))
          && (!filters.destination || ride.destination.toLocaleLowerCase().includes(filters.destination.toLocaleLowerCase()))
          && (!range || (ride.departureTime >= range.start && ride.departureTime < range.end)),
        )
        .sort((left, right) =>
          left.departureTime.localeCompare(right.departureTime) || left.id.localeCompare(right.id),
        )
        .map((ride) => ({ ...ride }));
    },

    async createRide(actorId: string, input: CreateRideRequest) {
      const driver = userFor(actorId);
      const parsed = createRideSchemaAt(clock()).safeParse(input);
      if (!parsed.success) {
        const fieldErrors = Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0] ?? "ride"), [issue.message]]),
        );
        throw makeError("VALIDATION_ERROR", "Check the ride fields.", fieldErrors);
      }

      const ride: Ride = {
        id: newId("ride"),
        driverId: driver.id,
        ...parsed.data,
        departureTime: new Date(parsed.data.departureTime).toISOString(),
        remainingSeats: parsed.data.seatCapacity,
        status: "ACTIVE",
      };
      rides = [...rides, ride];
      return { ...ride };
    },

    async book(rideId: string, actorId: string): Promise<BookingMutation> {
      const rider = userFor(actorId);
      const ride = rideFor(rideId);
      checkFutureRide(ride, clock());
      if (ride.driverId === rider.id) throw makeError("SELF_BOOKING", "Drivers cannot book their own rides.");
      if (bookings.some((booking) =>
        booking.rideId === ride.id && booking.riderId === rider.id && booking.status === "ACTIVE",
      )) {
        throw makeError("DUPLICATE_BOOKING", "You already have an active booking.");
      }
      if (ride.remainingSeats < 1) throw makeError("RIDE_FULL", "No seats remain.");

      const booking: Booking = {
        id: newId("booking"),
        rideId: ride.id,
        riderId: rider.id,
        status: "ACTIVE",
      };
      const updatedRide = { ...ride, remainingSeats: ride.remainingSeats - 1 };
      bookings = [...bookings, booking];
      setRide(updatedRide);
      return { booking: { ...booking }, ride: { ...updatedRide } };
    },

    async cancelBooking(bookingId: string, actorId: string): Promise<BookingMutation> {
      const rider = userFor(actorId);
      const booking = bookings.find(({ id }) => id === bookingId);
      if (!booking) throw makeError("NOT_FOUND", "Booking not found.");
      if (booking.riderId !== rider.id) throw makeError("WRONG_ACTOR", "Select the rider who owns this booking.");

      const ride = rideFor(booking.rideId);
      if (booking.status === "ACTIVE") {
        const cancelled: Booking = { ...booking, status: "CANCELLED" };
        bookings = bookings.map((item) => item.id === booking.id ? cancelled : item);
        if (ride.status === "ACTIVE") {
          setRide({ ...ride, remainingSeats: ride.remainingSeats + 1 });
        }
      }
      const currentBooking = bookings.find(({ id }) => id === booking.id);
      if (!currentBooking) throw new Error("Cancelled booking was not found.");
      return {
        booking: { ...currentBooking },
        ride: { ...rideFor(booking.rideId) },
      };
    },

    async cancelRide(rideId: string, actorId: string): Promise<RideCancellation> {
      const driver = userFor(actorId);
      const ride = rideFor(rideId);
      if (ride.driverId !== driver.id) throw makeError("WRONG_ACTOR", "Select the driver who owns this ride.");

      const cancelledBookingIds: string[] = [];
      bookings = bookings.map((booking) => {
        if (booking.rideId !== ride.id || booking.status !== "ACTIVE") return booking;
        cancelledBookingIds.push(booking.id);
        return { ...booking, status: "CANCELLED" };
      });
      const cancelledRide: Ride = { ...ride, status: "CANCELLED", remainingSeats: 0 };
      setRide(cancelledRide);
      return { ride: { ...cancelledRide }, cancelledBookingIds };
    },

    async getActivity(actorId: string): Promise<Activity> {
      const user = userFor(actorId);
      return {
        offeredRides: rides
          .filter((ride) => ride.driverId === user.id)
          .sort((left, right) => left.departureTime.localeCompare(right.departureTime))
          .map((ride) => ({ ...ride })),
        bookings: bookings
          .filter((booking) => booking.riderId === user.id)
          .map((booking) => ({
            ...booking,
            ride: { ...rideFor(booking.rideId) },
          })),
      };
    },
  };
}

export const mockCarpoolApi = createMockCarpoolApi();
