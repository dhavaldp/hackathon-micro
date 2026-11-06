import {
  PROVISIONAL_LOCATION_MAX_LENGTH,
  parseUtcDateBounds,
  validateRideCreateInput,
} from './validation.ts';
import type {
  ApiError,
  DemoUser,
  ErrorEnvelope,
  Ride,
  SuccessEnvelope,
} from './types.ts';
import type { DemoUserRepository, RideRepository } from './repositories.ts';

export interface RideListFilters {
  origin?: string;
  destination?: string;
  date?: string;
}

export interface ApiResult<T> {
  status: number;
  body: SuccessEnvelope<T> | ErrorEnvelope;
}

function failure<T>(status: number, error: ApiError): ApiResult<T> {
  return { status, body: { error } };
}

function normalizeFilter(
  value: string | undefined,
): { value: string | undefined; fieldError?: string } {
  const normalized = value?.trim();
  if (!normalized) return { value: undefined };
  if (normalized.length > PROVISIONAL_LOCATION_MAX_LENGTH) {
    return {
      value: undefined,
      fieldError: `Must be ${PROVISIONAL_LOCATION_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { value: normalized.toLocaleLowerCase('en-US') };
}

export class RideService {
  private readonly rides: RideRepository;
  private readonly users: DemoUserRepository;
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor(
    rides: RideRepository,
    users: DemoUserRepository,
    now: () => Date = () => new Date(),
    createId: () => string = () => globalThis.crypto.randomUUID(),
  ) {
    this.rides = rides;
    this.users = users;
    this.now = now;
    this.createId = createId;
  }

  listDemoUsers(): ApiResult<DemoUser[]> {
    return { status: 200, body: { data: this.users.list() } };
  }

  createRide(actorId: string | null, input: unknown): ApiResult<Ride> {
    if (!actorId?.trim()) {
      return failure(400, {
        code: 'DEMO_USER_REQUIRED',
        message: 'Select a demo user before creating a ride.',
      });
    }
    if (!this.users.findById(actorId)) {
      return failure(400, {
        code: 'UNKNOWN_DEMO_USER',
        message: 'The selected demo user does not exist.',
      });
    }

    const validated = validateRideCreateInput(input, this.now());
    if (!validated.ok) {
      return failure(400, {
        code: 'VALIDATION_ERROR',
        message: 'Ride details are invalid.',
        fieldErrors: validated.fieldErrors,
      });
    }

    const ride = this.rides.create({
      id: this.createId(),
      driverId: actorId,
      ...validated.value,
      remainingSeats: validated.value.seatCapacity,
      status: 'ACTIVE',
    });
    return { status: 201, body: { data: ride } };
  }

  listRides(filters: RideListFilters = {}): ApiResult<Ride[]> {
    const origin = normalizeFilter(filters.origin);
    const destination = normalizeFilter(filters.destination);
    const fieldErrors: Record<string, string[]> = {};
    if (origin.fieldError) fieldErrors.origin = [origin.fieldError];
    if (destination.fieldError) fieldErrors.destination = [destination.fieldError];

    let dateBounds: { start: number; end: number } | null = null;
    if (filters.date !== undefined && filters.date !== '') {
      dateBounds = parseUtcDateBounds(filters.date);
      if (!dateBounds) {
        fieldErrors.date = ['Must be a valid UTC calendar date in YYYY-MM-DD format.'];
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return failure(400, {
        code: 'VALIDATION_ERROR',
        message: 'Ride filters are invalid.',
        fieldErrors,
      });
    }

    const now = this.now().getTime();
    const rides = this.rides.list()
      .filter((ride) => ride.status === 'ACTIVE' && Date.parse(ride.departureTime) > now)
      .filter((ride) => !origin.value || ride.origin.toLocaleLowerCase('en-US').includes(origin.value))
      .filter((ride) => !destination.value || ride.destination.toLocaleLowerCase('en-US').includes(destination.value))
      .filter((ride) => {
        if (!dateBounds) return true;
        const departure = Date.parse(ride.departureTime);
        return departure >= dateBounds.start && departure < dateBounds.end;
      })
      .sort((left, right) => left.departureTime.localeCompare(right.departureTime) || left.id.localeCompare(right.id));

    return { status: 200, body: { data: rides } };
  }
}
