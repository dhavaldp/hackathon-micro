import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "./lib/cors";

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin, process.env.CORS_ALLOWED_ORIGINS ?? "");
  const allowed = !origin || headers.has("Access-Control-Allow-Origin");
  const response = !allowed
    ? NextResponse.json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Browser origin is not allowed." } }, { status: 403 })
    : request.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}
export const config = { matcher: "/api/:path*" };
