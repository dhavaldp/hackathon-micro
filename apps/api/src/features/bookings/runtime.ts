import { createBookingService } from "./service";
import { DatabaseContentionError, type BookingRepository } from "./types";

let repository: BookingRepository | undefined;

export function configureBookingRepository(bookingRepository: BookingRepository): void {
  repository = bookingRepository;
}

export function getBookingService() {
  const activeRepository = repository ?? unavailableRepository;
  return createBookingService(activeRepository);
}

const unavailableRepository: BookingRepository = {
  transaction<T>(): Promise<T> {
    return Promise.reject(new DatabaseContentionError());
  },
};