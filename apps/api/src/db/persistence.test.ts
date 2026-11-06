import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";
import { PersistenceError } from "@carpool/contracts";
import { activity, bookings, demoUsers, prisma, rides } from "./index";

const prefix = `test-${randomUUID()}`;
const driver = `${prefix}-driver`;
const rider1 = `${prefix}-rider1`;
const rider2 = `${prefix}-rider2`;
const rideId = (name: string) => `${prefix}-${name}`;
const future = new Date(Date.now() + 86_400_000);

before(async () => {
  await prisma.demoUser.createMany({ data: [
    { id: driver, displayName: "Driver Example" },
    { id: rider1, displayName: "Rider One Example" },
    { id: rider2, displayName: "Rider Two Example" },
  ] });
});

after(async () => {
  await prisma.booking.deleteMany({ where: { riderId: { in: [rider1, rider2] } } });
  await prisma.ride.deleteMany({ where: { driverId: driver } });
  await prisma.demoUser.deleteMany({ where: { id: { in: [driver, rider1, rider2] } } });
  await prisma.$disconnect();
});

async function createRide(name: string, capacity = 1) {
  return prisma.ride.create({ data: {
    id: rideId(name), driverId: driver, origin: "NORTHville", destination: "Lakeview",
    departureTime: future, seatCapacity: capacity, remainingSeats: capacity,
  } });
}

async function retry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof PersistenceError && error.code === "CONTENTION") || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
}

async function book(id: string, rider: string) {
  return retry(() => bookings.transaction(async (tx) => {
    if (!await tx.reserveSeat(id, new Date())) return null;
    return tx.insertBooking(id, rider);
  }));
}

test("repositories map UTC, filter and order rides, and retain activity", async () => {
  assert.equal((await demoUsers.findById(driver))?.displayName, "Driver Example");
  assert.equal(await demoUsers.findById(`${prefix}-missing`), null);
  assert.ok((await demoUsers.list()).some((user) => user.id === rider1));
  const created = await rides.create(driver, {
    origin: "Northville", destination: "Lakeview", departureTime: future.toISOString(), seatCapacity: 2,
  });
  assert.equal(created.remainingSeats, 2);
  assert.equal(created.departureTime, future.toISOString());
  const result = await rides.listUpcoming({ origin: "  north  ", destination: "LAKE", date: future.toISOString().slice(0, 10) }, new Date());
  assert.ok(result.some((ride) => ride.id === created.id));
  assert.ok(result.every((ride, index) => index === 0 || result[index - 1].departureTime <= ride.departureTime));
  assert.ok((await activity.forUser(driver)).offeredRides.some((ride) => ride.id === created.id));
});

test("database rejects invalid capacity, status, and foreign keys", async () => {
  await createRide("constraints");
  await assert.rejects(prisma.ride.update({ where: { id: rideId("constraints") }, data: { remainingSeats: 2 } }));
  await assert.rejects(prisma.ride.update({ where: { id: rideId("constraints") }, data: { seatCapacity: 0 } }));
  await assert.rejects(prisma.ride.update({ where: { id: rideId("constraints") }, data: { status: "UNKNOWN" } }));
  await assert.rejects(prisma.booking.create({ data: { rideId: rideId("constraints"), riderId: `${prefix}-missing` } }));
  await assert.rejects(prisma.booking.create({ data: { rideId: rideId("constraints"), riderId: rider1, status: "UNKNOWN" } }));
});

test("repeated seeding preserves modified and user-created data", async () => {
  const original = await prisma.demoUser.findUniqueOrThrow({ where: { id: "demo-avery" } });
  try {
    await prisma.demoUser.update({ where: { id: original.id }, data: { displayName: "Modified Example" } });
    await promisify(execFile)("npm", ["run", "db:seed"], { cwd: process.cwd(), env: process.env });
    assert.equal((await prisma.demoUser.findUniqueOrThrow({ where: { id: original.id } })).displayName, "Modified Example");
    assert.ok(await prisma.demoUser.findUnique({ where: { id: driver } }));
  } finally {
    await prisma.demoUser.update({ where: { id: original.id }, data: { displayName: original.displayName } });
  }
});

test("duplicate active insertion rolls back its reservation; cancellation permits rebooking", async () => {
  await createRide("duplicate", 2);
  const first = await book(rideId("duplicate"), rider1);
  assert.ok(first);
  await assert.rejects(bookings.transaction((tx) => tx.restoreSeat(first.rideId)), /Cannot restore/);
  await assert.rejects(book(rideId("duplicate"), rider1),
    (error: unknown) => error instanceof PersistenceError && error.code === "DUPLICATE_ACTIVE_BOOKING");
  assert.equal((await prisma.ride.findUniqueOrThrow({ where: { id: rideId("duplicate") } })).remainingSeats, 1);
  await bookings.transaction(async (tx) => {
    assert.equal((await tx.findBooking(first.id))?.id, first.id);
    assert.equal((await tx.findActiveBooking(first.rideId, rider1))?.id, first.id);
    assert.equal(await tx.cancelActiveBooking(first.id), true);
    await tx.restoreSeat(first.rideId);
    assert.equal(await tx.cancelActiveBooking(first.id), false);
    await assert.rejects(tx.restoreSeat(first.rideId), /Cannot restore/);
  });
  assert.ok(await book(rideId("duplicate"), rider1));
  const userActivity = await activity.forUser(rider1);
  assert.ok(userActivity.bookings.some((item) => item.id === first.id && item.status === "CANCELLED"));
});

test("conditional reservation respects status, departure, capacity, and explicit rollback", async () => {
  await createRide("rollback");
  await assert.rejects(bookings.transaction(async (tx) => {
    assert.equal(await tx.reserveSeat(rideId("rollback"), new Date()), true);
    throw new Error("business rule rejected");
  }), /business rule rejected/);
  assert.equal((await prisma.ride.findUniqueOrThrow({ where: { id: rideId("rollback") } })).remainingSeats, 1);
  await assert.rejects(bookings.transaction((tx) => tx.restoreSeat(rideId("rollback"))), /Cannot restore/);
  assert.equal(await bookings.transaction((tx) => tx.reserveSeat(rideId("rollback"), new Date(future.getTime() + 1))), false);
});

test("concurrent reservations cannot oversell the last seat", async () => {
  await createRide("race");
  const results = await Promise.all([book(rideId("race"), rider1), book(rideId("race"), rider2)]);
  assert.equal(results.filter(Boolean).length, 1);
  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: rideId("race") } });
  assert.equal(ride.remainingSeats, 0);
  assert.equal(await prisma.booking.count({ where: { rideId: ride.id, status: "ACTIVE" } }), 1);
});

test("concurrent duplicate attempts preserve active uniqueness and capacity", async () => {
  await createRide("duplicate-race", 2);
  const results = await Promise.allSettled([book(rideId("duplicate-race"), rider1), book(rideId("duplicate-race"), rider1)]);
  assert.equal(results.filter((result) => result.status === "fulfilled" && result.value !== null).length, 1);
  const failed = results.find((result) => result.status === "rejected");
  assert.ok(failed && failed.status === "rejected" && failed.reason instanceof PersistenceError && failed.reason.code === "DUPLICATE_ACTIVE_BOOKING");
  assert.equal((await prisma.ride.findUniqueOrThrow({ where: { id: rideId("duplicate-race") } })).remainingSeats, 1);
  assert.equal(await prisma.booking.count({ where: { rideId: rideId("duplicate-race"), status: "ACTIVE" } }), 1);
});

test("ride cancellation is atomic, repeat-safe, and blocks reservations", async () => {
  await createRide("cancel", 2);
  const first = await book(rideId("cancel"), rider1);
  const second = await book(rideId("cancel"), rider2);
  assert.ok(first && second);
  const result = await bookings.transaction((tx) => tx.cancelRideAndBookings(rideId("cancel")));
  assert.deepEqual(result.cancelledBookingIds.sort(), [first.id, second.id].sort());
  assert.equal(result.ride.status, "CANCELLED");
  assert.equal(result.ride.remainingSeats, 0);
  assert.deepEqual((await bookings.transaction((tx) => tx.cancelRideAndBookings(rideId("cancel")))).cancelledBookingIds, []);
  assert.equal(await bookings.transaction((tx) => tx.reserveSeat(rideId("cancel"), new Date())), false);
  assert.equal(await prisma.booking.count({ where: { rideId: rideId("cancel"), status: "ACTIVE" } }), 0);
  await assert.rejects(bookings.transaction((tx) => tx.restoreSeat(rideId("cancel"))), /Cannot restore/);
});

test("booking racing ride cancellation leaves no active booking on a cancelled ride", async () => {
  await createRide("cancel-race");
  await Promise.all([
    book(rideId("cancel-race"), rider1),
    retry(() => bookings.transaction((tx) => tx.cancelRideAndBookings(rideId("cancel-race")))),
  ]);
  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: rideId("cancel-race") } });
  assert.equal(ride.status, "CANCELLED");
  assert.equal(ride.remainingSeats, 0);
  assert.equal(await prisma.booking.count({ where: { rideId: ride.id, status: "ACTIVE" } }), 0);
});

test("SQLite write lock exhausts bounded whole-transaction retries and later recovers", async () => {
  await createRide("locked");
  const file = process.env.DATABASE_URL?.replace(/^file:/, "");
  assert.ok(file && isAbsolute(file), "The test database URL must be an absolute file: URL.");
  const lock = spawn(process.execPath, ["--experimental-sqlite", "-e", `
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(process.argv[1]);
    db.exec("BEGIN IMMEDIATE");
    process.stdout.write("locked\\n");
    process.stdin.resume();
    process.stdin.on("end", () => { db.exec("ROLLBACK"); db.close(); });
  `, file], { stdio: ["pipe", "pipe", "pipe"] });
  try {
    await new Promise<void>((resolve, reject) => {
      lock.stdout.once("data", () => resolve());
      lock.once("error", reject);
      lock.once("exit", (code) => reject(new Error(`Lock process exited before readiness: ${code}`)));
    });
    let attempts = 0;
    await assert.rejects(retry(() => {
      attempts++;
      return bookings.transaction((tx) => tx.reserveSeat(rideId("locked"), new Date()));
    }),
      (error: unknown) => error instanceof PersistenceError && error.code === "CONTENTION");
    assert.equal(attempts, 3);
  } finally {
    lock.stdin.end();
    await new Promise<void>((resolve) => {
      if (lock.exitCode !== null) resolve();
      else lock.once("exit", () => resolve());
    });
  }
  assert.equal((await prisma.ride.findUniqueOrThrow({ where: { id: rideId("locked") } })).remainingSeats, 1);
  assert.ok(await book(rideId("locked"), rider1));
});
