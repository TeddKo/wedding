import type { ErrorCode } from "@wedding/shared";
import type { ErrorHandler } from "hono";
import { routePath } from "hono/route";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppEnv } from "./env";

export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    readonly extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export function fail(status: ContentfulStatusCode, code: ErrorCode, extra?: Record<string, unknown>): never {
  throw new AppError(status, code, extra);
}

export const notAllowed = () => fail(405, "method not allowed");

/** 로그에는 cf-ray·라우트 패턴·오류 이름만 기록 */
export const onError: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError)
    return c.body(JSON.stringify({ error: err.code, ...err.extra }), err.status, { "Content-Type": "application/json; charset=utf-8" });
  console.error(JSON.stringify({ ray: c.req.header("cf-ray") ?? null, route: routePath(c), err: err.name }));
  return c.body(JSON.stringify({ error: "server error" satisfies ErrorCode }), 500, { "Content-Type": "application/json; charset=utf-8" });
};
