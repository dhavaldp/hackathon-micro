import { z } from "zod";
import raw from "../fixtures/demo.json";
import {
  activitySchema, apiErrorSchema, bookingMutationSchema, bookingSchema, demoUserSchema,
  instantSchema, rideCancellationSchema, rideSchema, successSchema,
} from "./index";

export const fixtures = z.object({
  clock: instantSchema,
  users: z.array(demoUserSchema),
  rides: z.array(rideSchema),
  bookings: z.array(bookingSchema),
  emptyRides: successSchema(z.array(rideSchema)),
  emptyActivity: successSchema(activitySchema),
  errors: z.array(apiErrorSchema),
}).parse(raw);
export const discoveryResponse = {
  data: fixtures.rides.filter((ride) =>
    ride.status === "ACTIVE" && ride.departureTime > fixtures.clock),
};
export const bookingResponse = successSchema(bookingMutationSchema).parse({
  data: { booking: fixtures.bookings[0], ride: fixtures.rides[0] },
});
export const bookingCancellationResponse = successSchema(bookingMutationSchema).parse({
  data: {
    booking: { ...fixtures.bookings[0], status: "CANCELLED" },
    ride: { ...fixtures.rides[0], remainingSeats: 2 },
  },
});
export const rideCancellationResponse = successSchema(rideCancellationSchema).parse({
  data: {
    ride: { ...fixtures.rides[0], status: "CANCELLED", remainingSeats: 0 },
    cancelledBookingIds: [fixtures.bookings[0].id],
  },
});
export const activityResponse = successSchema(activitySchema).parse({
  data: {
    offeredRides: [],
    bookings: [0, 2].map((index) => ({
      ...fixtures.bookings[index],
      ride: fixtures.rides.find((ride) => ride.id === fixtures.bookings[index].rideId),
    })),
  },
});
