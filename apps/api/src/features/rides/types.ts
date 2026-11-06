export const DEMO_USER_HEADER = 'X-Demo-User-Id';

export type RideStatus = 'ACTIVE' | 'CANCELLED';

export interface DemoUser {
  id: string;
  displayName: string;
  contactDetails?: string;
}

export interface Ride {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  departureTime: string;
  seatCapacity: number;
  remainingSeats: number;
  status: RideStatus;
}

export interface RideCreateInput {
  origin: string;
  destination: string;
  departureTime: string;
  seatCapacity: number;
}

export interface ApiError {
  code: 'VALIDATION_ERROR' | 'DEMO_USER_REQUIRED' | 'UNKNOWN_DEMO_USER';
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export interface SuccessEnvelope<T> {
  data: T;
}

export interface ErrorEnvelope {
  error: ApiError;
}
