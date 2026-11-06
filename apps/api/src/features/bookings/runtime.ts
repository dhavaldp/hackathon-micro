import { activity, bookings, demoUsers } from "../../db";
import { createBookingService } from "./service";

const service = createBookingService(bookings, demoUsers, activity);

export function getBookingService() {
  return service;
}
