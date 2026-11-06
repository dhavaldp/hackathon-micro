import { CONTRACT_VERSION, type ApiSuccess, type Health } from "@carpool/contracts";

export function GET() {
  const response: ApiSuccess<Health> = {
    data: { status: "ok", contractVersion: CONTRACT_VERSION, scope: "foundation-only" },
  };
  return Response.json(response);
}
