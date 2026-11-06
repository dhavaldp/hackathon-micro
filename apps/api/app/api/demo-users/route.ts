import { demoUsers } from "../../../src/db";

export async function GET(): Promise<Response> {
  try {
    return Response.json({ data: await demoUsers.list() });
  } catch (error) {
    console.error("Failed to list demo users:", error);
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }, { status: 500 });
  }
}
