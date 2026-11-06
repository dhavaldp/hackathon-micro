import { rideService } from '../../../features/rides/runtime.ts';

export function GET(): Response {
  const result = rideService.listDemoUsers();
  return Response.json(result.body, { status: result.status });
}
