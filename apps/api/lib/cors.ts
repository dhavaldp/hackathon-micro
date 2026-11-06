import { DEMO_USER_HEADER } from "@carpool/contracts";

export function corsHeaders(origin: string | null, allowed: string): Headers {
  const headers = new Headers({ Vary: "Origin" });
  const origins = allowed.split(",").map((value) => value.trim()).filter(Boolean);
  if (origin && origins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", `Content-Type, ${DEMO_USER_HEADER}`);
  }
  return headers;
}
