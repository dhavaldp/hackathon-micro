import { handleBookingRequest } from "../../../../../src/features/bookings/http";

type RouteContext = { params: { bookingId: string } | Promise<{ bookingId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { bookingId } = await context.params;
  return handleBookingRequest(request, (service, riderId) => service.cancelBooking(bookingId, riderId));
}