import {
  API_PATHS,
  DEMO_USER_HEADER,
  activitySchema,
  apiErrorSchema,
  bookingMutationSchema,
  createRideSchema,
  demoUserSchema,
  discoveryQuerySchema,
  rideCancellationSchema,
  rideSchema,
  successSchema,
  type Activity,
  type ApiError,
  type BookingMutation,
  type CreateRideRequest,
  type DemoUser,
  type DiscoveryQuery,
  type Ride,
  type RideCancellation,
} from "@carpool/contracts";
import { z } from "zod";

export interface CarpoolApi {
  listUsers(): Promise<DemoUser[]>;
  listRides(query?: DiscoveryQuery): Promise<Ride[]>;
  createRide(actorId: string, input: CreateRideRequest): Promise<Ride>;
  book(rideId: string, actorId: string): Promise<BookingMutation>;
  cancelBooking(bookingId: string, actorId: string): Promise<BookingMutation>;
  cancelRide(rideId: string, actorId: string): Promise<RideCancellation>;
  getActivity(actorId: string): Promise<Activity>;
}

export class CarpoolApiError extends Error {
  readonly code: ApiError["error"]["code"];
  readonly fieldErrors?: Record<string, string[]>;

  constructor(error: ApiError["error"]) {
    super(error.message);
    this.name = "CarpoolApiError";
    this.code = error.code;
    this.fieldErrors = error.fieldErrors;
  }
}

export function createLiveCarpoolApi(baseUrl: string | undefined): CarpoolApi {
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: { actorId?: string; method?: "GET" | "POST"; body?: unknown } = {},
  ): Promise<T> {
    if (!baseUrl) {
      throw new Error("Set EXPO_PUBLIC_API_BASE_URL and restart Expo to use the live API.");
    }

    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch {
      throw new Error("EXPO_PUBLIC_API_BASE_URL must be an absolute HTTP or HTTPS URL.");
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS.");
    }

    const headers: Record<string, string> = {};
    if (options.actorId) headers[DEMO_USER_HEADER] = options.actorId;
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(`${url.toString().replace(/\/+$/, "")}${path}`, {
      method: options.method ?? "GET",
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    const payload: unknown = await response.json();

    if (!response.ok) {
      const error = apiErrorSchema.safeParse(payload);
      if (error.success) throw new CarpoolApiError(error.data.error);
      throw new Error(`API returned HTTP ${response.status} with an invalid error response.`);
    }

    const result = successSchema(schema).safeParse(payload);
    if (!result.success) {
      throw new Error(`API returned an invalid response for ${path}.`);
    }
    return result.data.data;
  }

  return {
    listUsers: () => request(API_PATHS.demoUsers, z.array(demoUserSchema)),
    listRides: (query = {}) => {
      const filters = discoveryQuerySchema.parse(query);
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      return request(`${API_PATHS.rides}${suffix}`, z.array(rideSchema));
    },
    createRide: (actorId, input) => request(
      API_PATHS.rides,
      rideSchema,
      { actorId, method: "POST", body: createRideSchema.parse(input) },
    ),
    book: (rideId, actorId) => request(
      API_PATHS.book(rideId),
      bookingMutationSchema,
      { actorId, method: "POST" },
    ),
    cancelBooking: (bookingId, actorId) => request(
      API_PATHS.cancelBooking(bookingId),
      bookingMutationSchema,
      { actorId, method: "POST" },
    ),
    cancelRide: (rideId, actorId) => request(
      API_PATHS.cancelRide(rideId),
      rideCancellationSchema,
      { actorId, method: "POST" },
    ),
    getActivity: (actorId) => request(API_PATHS.activity, activitySchema, { actorId }),
  };
}
