import { ERROR_STATUS, type ApiError, type ApiSuccess, type ErrorCode } from "@carpool/contracts";

export function jsonSuccess<T>(data: T, status = 200) {
  const body: ApiSuccess<T> = { data };
  return Response.json(body, { status });
}
export function jsonError(code: ErrorCode, message: string, fieldErrors?: Record<string, string[]>) {
  const body: ApiError = { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } };
  return Response.json(body, { status: ERROR_STATUS[code] });
}
