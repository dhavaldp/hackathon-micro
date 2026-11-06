CREATE TABLE "DemoUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "contactDetails" TEXT
);

CREATE TABLE "Ride" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "driverId" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "departureTime" DATETIME NOT NULL,
  "seatCapacity" INTEGER NOT NULL,
  "remainingSeats" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DemoUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Ride_capacity_check" CHECK ("seatCapacity" BETWEEN 1 AND 8 AND "remainingSeats" BETWEEN 0 AND "seatCapacity"),
  CONSTRAINT "Ride_status_check" CHECK ("status" IN ('ACTIVE', 'CANCELLED') AND ("status" != 'CANCELLED' OR "remainingSeats" = 0))
);

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "rideId" TEXT NOT NULL,
  "riderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "Booking_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Booking_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "DemoUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Booking_status_check" CHECK ("status" IN ('ACTIVE', 'CANCELLED'))
);

CREATE INDEX "Ride_status_departureTime_id_idx" ON "Ride"("status", "departureTime", "id");
CREATE INDEX "Ride_driverId_idx" ON "Ride"("driverId");
CREATE INDEX "Booking_riderId_idx" ON "Booking"("riderId");
CREATE INDEX "Booking_rideId_idx" ON "Booking"("rideId");
CREATE UNIQUE INDEX "Booking_active_rideId_riderId_key" ON "Booking"("rideId", "riderId") WHERE "status" = 'ACTIVE';
