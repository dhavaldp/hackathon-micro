import { createRideSchemaAt, DEMO_USER_HEADER, discoveryQuerySchema } from "@carpool/contracts";
import { demoUsers, rides } from "../../../src/db";
import { z } from "zod";

function validationError(error: z.ZodError): Response {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.length ? String(issue.path[0]) : "body";
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return Response.json({ error: { code: "VALIDATION_ERROR", message: "Ride details are invalid.", fieldErrors } }, { status: 400 });
}

function internalError(error: unknown): Response {
  console.error("Ride request failed:", error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }, { status: 500 });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query = discoveryQuerySchema.safeParse(Object.fromEntries(params));
  if (!query.success) return validationError(query.error);
  try {
    return Response.json({ data: await rides.listUpcoming(query.data, new Date()) });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const actor = request.headers.get(DEMO_USER_HEADER)?.trim();
  if (!actor) return Response.json({ error: { code: "DEMO_USER_REQUIRED", message: "Select a demo user." } }, { status: 400 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON.", fieldErrors: { body: ["Must be valid JSON."] } } }, { status: 400 });
  }
  const parsed = createRideSchemaAt(new Date()).safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  try {
    if (!await demoUsers.findById(actor)) {
      return Response.json({ error: { code: "DEMO_USER_NOT_FOUND", message: "Select a valid demo user." } }, { status: 400 });
    }
    return Response.json({ data: await rides.create(actor, parsed.data) }, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
