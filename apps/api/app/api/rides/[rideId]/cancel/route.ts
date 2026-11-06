import { handleBookingRequest } from "../../../../../src/features/bookings/http";

type RouteContext = { params: { rideId: string } | Promise<{ rideId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { rideId } = await context.params;
  return handleBookingRequest(request, (service, driverId) => service.cancelRide(rideId, driverId));
}