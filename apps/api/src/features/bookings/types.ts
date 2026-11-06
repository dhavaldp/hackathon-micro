import type { ErrorCode } from "@carpool/contracts";

export class BookingError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BookingError";
  }
}
