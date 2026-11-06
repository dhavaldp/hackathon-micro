import { DEMO_USER_HEADER } from '../../../features/rides/types.ts';
import { rideService } from '../../../features/rides/runtime.ts';

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const result = rideService.listRides({
    origin: url.searchParams.get('origin') ?? undefined,
    destination: url.searchParams.get('destination') ?? undefined,
    date: url.searchParams.get('date') ?? undefined,
  });
  return Response.json(result.body, { status: result.status });
}

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body must be valid JSON.',
        fieldErrors: { body: ['Must be valid JSON.'] },
      },
    }, { status: 400 });
  }

  const result = rideService.createRide(request.headers.get(DEMO_USER_HEADER), input);
  return Response.json(result.body, { status: result.status });
}
