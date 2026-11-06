import { handleBookingRequest } from "../../../../src/features/bookings/http";

export async function GET(request: Request): Promise<Response> {
  return handleBookingRequest(request, (service, userId) => service.getActivity(userId));
}