import { Prisma, type Booking as StoredBooking, type DemoUser as StoredUser, type Ride as StoredRide } from "@prisma/client";
import {
  PersistenceError, bookingSchema, rideSchema, utcDateRange,
  type ActivityRepository, type BookingRepository, type BookingTransaction,
  type DemoUserRepository, type RideRepository,
} from "@carpool/contracts";
import { prisma } from "./client";

function mapRide(ride: StoredRide) {
  return rideSchema.parse({ ...ride, departureTime: ride.departureTime.toISOString() });
}

function mapBooking(booking: StoredBooking) {
  return bookingSchema.parse(booking);
}

function mapUser(user: StoredUser) {
  return { id: user.id, displayName: user.displayName, ...(user.contactDetails === null ? {} : { contactDetails: user.contactDetails }) };
}

function isContention(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError &&
      (["P1008", "P2024", "P2034"].includes(error.code) ||
       (error.code === "P2028" && /unable to start a transaction in the given time/i.test(error.message)))) return true;
  return error instanceof Error && /SQLITE_BUSY|database is (?:locked|busy)/i.test(error.message);
}

function transactionAdapter(db: Prisma.TransactionClient): BookingTransaction {
  return {
    async findRide(id) {
      const ride = await db.ride.findUnique({ where: { id } });
      return ride && mapRide(ride);
    },
    async findBooking(id) {
      const booking = await db.booking.findUnique({ where: { id } });
      return booking && mapBooking(booking);
    },
    async findActiveBooking(rideId, riderId) {
      const booking = await db.booking.findFirst({ where: { rideId, riderId, status: "ACTIVE" } });
      return booking && mapBooking(booking);
    },
    async reserveSeat(rideId, now) {
      const result = await db.ride.updateMany({
        where: { id: rideId, status: "ACTIVE", departureTime: { gt: now }, remainingSeats: { gt: 0 } },
        data: { remainingSeats: { decrement: 1 } },
      });
      return result.count === 1;
    },
    async insertBooking(rideId, riderId) {
      try {
        return mapBooking(await db.booking.create({ data: { rideId, riderId } }));
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new PersistenceError("DUPLICATE_ACTIVE_BOOKING", "An active booking already exists for this ride and rider.");
        }
        throw error;
      }
    },
    async cancelActiveBooking(id) {
      const result = await db.booking.updateMany({ where: { id, status: "ACTIVE" }, data: { status: "CANCELLED" } });
      return result.count === 1;
    },
    async restoreSeat(rideId) {
      const result = await db.$executeRaw`
        UPDATE "Ride" SET "remainingSeats" = "remainingSeats" + 1
        WHERE "id" = ${rideId} AND "status" = 'ACTIVE'
          AND "remainingSeats" < "seatCapacity" - (
            SELECT COUNT(*) FROM "Booking" WHERE "rideId" = ${rideId} AND "status" = 'ACTIVE'
          )
      `;
      if (result !== 1) throw new Error("Cannot restore a seat without an outstanding cancelled booking on an active ride.");
    },
    async cancelRideAndBookings(rideId) {
      const changed = await db.booking.findMany({ where: { rideId, status: "ACTIVE" }, select: { id: true }, orderBy: { id: "asc" } });
      await db.booking.updateMany({ where: { rideId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
      const ride = await db.ride.update({ where: { id: rideId }, data: { status: "CANCELLED", remainingSeats: 0 } });
      return { ride: mapRide(ride), cancelledBookingIds: changed.map(({ id }) => id) };
    },
  };
}

export const demoUsers: DemoUserRepository = {
  async list() {
    return (await prisma.demoUser.findMany({ orderBy: { id: "asc" } })).map(mapUser);
  },
  async findById(id) {
    const user = await prisma.demoUser.findUnique({ where: { id } });
    return user && mapUser(user);
  },
};

export const rides: RideRepository = {
  async create(driverId, input) {
    return mapRide(await prisma.ride.create({
      data: { ...input, driverId, departureTime: new Date(input.departureTime), remainingSeats: input.seatCapacity },
    }));
  },
  async listUpcoming(query, now) {
    const range = query.date ? utcDateRange(query.date) : undefined;
    const candidates = await prisma.ride.findMany({
      where: {
        status: "ACTIVE",
        departureTime: { gt: now, ...(range && { gte: new Date(range.start), lt: new Date(range.end) }) },
      },
      orderBy: [{ departureTime: "asc" }, { id: "asc" }],
    });
    const origin = query.origin?.trim().toLowerCase();
    const destination = query.destination?.trim().toLowerCase();
    return candidates.filter((ride) =>
      (!origin || ride.origin.toLowerCase().includes(origin)) &&
      (!destination || ride.destination.toLowerCase().includes(destination)),
    ).map(mapRide);
  },
};

export const activity: ActivityRepository = {
  async forUser(userId) {
    const [offeredRides, bookings] = await prisma.$transaction([
      prisma.ride.findMany({ where: { driverId: userId }, orderBy: [{ departureTime: "asc" }, { id: "asc" }] }),
      prisma.booking.findMany({ where: { riderId: userId }, include: { ride: true }, orderBy: { id: "asc" } }),
    ]);
    return {
      offeredRides: offeredRides.map(mapRide),
      bookings: bookings.map((booking) => ({ ...mapBooking(booking), ride: mapRide(booking.ride) })),
    };
  },
};

export const bookings: BookingRepository = {
  async transaction(operation) {
    try {
      return await prisma.$transaction((db) => operation(transactionAdapter(db)));
    } catch (error) {
      if (isContention(error)) throw new PersistenceError("CONTENTION", "SQLite transaction contention.");
      throw error;
    }
  },
};

export { prisma } from "./client";
