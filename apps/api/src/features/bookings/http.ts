import { getBookingService } from "./runtime";
import { BookingError } from "./types";

type BookingOperation = (service: ReturnType<typeof getBookingService>, actorId: string) => Promise<unknown>;

export async function handleBookingRequest(
  request: Request,
  operation: BookingOperation,
  successStatus = 200,
): Promise<Response> {
  try {
    const actorId = request.headers.get("X-Demo-User-Id")?.trim();
    if (!actorId) {
      throw new BookingError("DEMO_USER_REQUIRED", "X-Demo-User-Id is required.", 400);
    }

    const data = await operation(getBookingService(), actorId);
    return jsonResponse({ data }, successStatus);
  } catch (error) {
    if (error instanceof BookingError) {
      return jsonResponse({ error: { code: error.code, message: error.message } }, error.status);
    }

    console.error("Booking request failed:", error);
    return jsonResponse(
      { error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } },
      500,
    );
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}