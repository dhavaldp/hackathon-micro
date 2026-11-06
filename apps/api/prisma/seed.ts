import { prisma } from "../src/db/client";

async function seed() {
  const now = Date.now();
  await prisma.$transaction(async (db) => {
    for (const user of [
      { id: "demo-avery", displayName: "Avery Example", contactDetails: "avery@example.invalid" },
      { id: "demo-blair", displayName: "Blair Example", contactDetails: "blair@example.invalid" },
      { id: "demo-casey", displayName: "Casey Example" },
    ]) {
      await db.demoUser.upsert({ where: { id: user.id }, create: user, update: {} });
    }

    const sampleRides = [
      {
        id: "demo-ride-available", driverId: "demo-avery", origin: "Northville", destination: "Lakeview",
        departureTime: new Date(now + 2 * 86_400_000), seatCapacity: 3, remainingSeats: 2, status: "ACTIVE",
        bookings: [{ id: "demo-booking-active", riderId: "demo-blair", status: "ACTIVE" }],
      },
      {
        id: "demo-ride-full", driverId: "demo-avery", origin: "Lakeview", destination: "Hillcrest",
        departureTime: new Date(now + 3 * 86_400_000), seatCapacity: 1, remainingSeats: 0, status: "ACTIVE",
        bookings: [{ id: "demo-booking-full", riderId: "demo-casey", status: "ACTIVE" }],
      },
      {
        id: "demo-ride-cancelled", driverId: "demo-blair", origin: "Hillcrest", destination: "Northville",
        departureTime: new Date(now + 4 * 86_400_000), seatCapacity: 2, remainingSeats: 0, status: "CANCELLED",
        bookings: [{ id: "demo-booking-cancelled", riderId: "demo-casey", status: "CANCELLED" }],
      },
      {
        id: "demo-ride-departed", driverId: "demo-casey", origin: "Northville", destination: "Hillcrest",
        departureTime: new Date(now - 86_400_000), seatCapacity: 2, remainingSeats: 2, status: "ACTIVE",
        bookings: [],
      },
    ];
    for (const { bookings, ...ride } of sampleRides) {
      if (await db.ride.findUnique({ where: { id: ride.id } })) continue;
      await db.ride.create({ data: { ...ride, bookings: { create: bookings } } });
    }
  });
}

seed().then(
  async () => { await prisma.$disconnect(); },
  async (error: unknown) => { console.error("Seed failed:", error); await prisma.$disconnect(); process.exitCode = 1; },
);
