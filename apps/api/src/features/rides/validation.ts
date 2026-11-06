import type { RideCreateInput } from './types.ts';

export const PROVISIONAL_LOCATION_MAX_LENGTH = 80;
export const PROVISIONAL_MAX_SEAT_CAPACITY = 8;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: Record<string, string[]> };

const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/i;

function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): boolean {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second &&
    date.getUTCMilliseconds() === millisecond
  );
}

export function parseIsoInstant(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = dateTimePattern.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fractionText, , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText ?? 0);
  const millisecond = Number((fractionText ?? '').padEnd(3, '0'));
  const offsetHour = Number(offsetHourText ?? 0);
  const offsetMinute = Number(offsetMinuteText ?? 0);

  if (
    !isValidCalendarDate(year, month, day, hour, minute, second, millisecond) ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function parseUtcDateBounds(value: unknown): { start: number; end: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) return null;

  const startDate = new Date(0);
  startDate.setUTCFullYear(year, month - 1, day);
  startDate.setUTCHours(0, 0, 0, 0);
  const start = startDate.getTime();
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

function addFieldError(
  fieldErrors: Record<string, string[]>,
  field: string,
  message: string,
): void {
  (fieldErrors[field] ??= []).push(message);
}

function readLocation(
  value: unknown,
  field: 'origin' | 'destination',
  fieldErrors: Record<string, string[]>,
): string | null {
  if (typeof value !== 'string') {
    addFieldError(fieldErrors, field, 'Must be a string.');
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    addFieldError(fieldErrors, field, 'Must not be empty.');
    return null;
  }
  if (normalized.length > PROVISIONAL_LOCATION_MAX_LENGTH) {
    addFieldError(
      fieldErrors,
      field,
      `Must be ${PROVISIONAL_LOCATION_MAX_LENGTH} characters or fewer.`,
    );
    return null;
  }
  return normalized;
}

export function validateRideCreateInput(
  input: unknown,
  now: Date = new Date(),
): ValidationResult<RideCreateInput> {
  const fieldErrors: Record<string, string[]> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, fieldErrors: { body: ['Must be a JSON object.'] } };
  }

  const body = input as Record<string, unknown>;
  const origin = readLocation(body.origin, 'origin', fieldErrors);
  const destination = readLocation(body.destination, 'destination', fieldErrors);
  const departureTime = parseIsoInstant(body.departureTime);
  if (!departureTime) {
    addFieldError(fieldErrors, 'departureTime', 'Must be an ISO 8601 date-time with an explicit UTC offset.');
  } else if (Date.parse(departureTime) <= now.getTime()) {
    addFieldError(fieldErrors, 'departureTime', 'Must be in the future.');
  }

  const seatCapacity = body.seatCapacity;
  if (
    typeof seatCapacity !== 'number' ||
    !Number.isInteger(seatCapacity) ||
    seatCapacity < 1 ||
    seatCapacity > PROVISIONAL_MAX_SEAT_CAPACITY
  ) {
    addFieldError(
      fieldErrors,
      'seatCapacity',
      `Must be a positive integer no greater than ${PROVISIONAL_MAX_SEAT_CAPACITY}.`,
    );
  }

  if (Object.keys(fieldErrors).length > 0 || !origin || !destination || !departureTime || typeof seatCapacity !== 'number') {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: { origin, destination, departureTime, seatCapacity },
  };
}
