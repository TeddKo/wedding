import type { ErrorCode } from "@wedding/shared";
import { MAX_BODY } from "@wedding/shared";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType, z } from "zod";
import { ipKey, sha256 } from "./domain/crypto";
import type { AppEnv } from "./env";
import { AppError } from "./errors";

type Ctx = Context<AppEnv>;

export const json = (c: Ctx, body: unknown, status: ContentfulStatusCode = 200) =>
  c.body(JSON.stringify(body), status, { "Content-Type": "application/json; charset=utf-8" });

export const noContent = (c: Ctx) => c.body(null, 204);

/** 본문을 cap 바이트까지만 스트림으로 읽고, 초과 시 리더를 취소하고 null */
export async function readCapped(req: Request, cap: number): Promise<Uint8Array | null> {
  const declared = req.headers.get("Content-Length");
  if (declared !== null && /^\d{1,15}$/.test(declared) && Number(declared) > cap) return null;
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const out = new Uint8Array(cap);
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out.subarray(0, n);
    if (n + value.byteLength > cap) {
      await reader.cancel();
      return null;
    }
    out.set(value, n);
    n += value.byteLength;
  }
}

/** application/json 만 허용, 4KB 상한, 일반 객체가 아니면 null */
export async function readJsonObject(c: Ctx): Promise<Record<string, unknown> | null> {
  const ct = (c.req.header("Content-Type") ?? "").split(";")[0]?.trim().toLowerCase();
  if (ct !== "application/json") return null;
  const buf = await readCapped(c.req.raw, MAX_BODY);
  if (!buf) return null;
  try {
    const v: unknown = JSON.parse(new TextDecoder().decode(buf));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** zod 검증 실패 시 첫 이슈의 키에 대응하는 오류 코드로 400 */
export function parseBody<T extends ZodType>(
  schema: T,
  body: unknown,
  codes: Record<string, ErrorCode> = {},
  fallback: ErrorCode = "invalid body",
): z.output<T> {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  throw new AppError(400, codes[String(r.error.issues[0]?.path[0])] ?? fallback);
}

export const ipHash = (c: Ctx) => sha256(ipKey(c.req.header("CF-Connecting-IP") ?? "") + c.env.IP_PEPPER);

export const bearer = (c: Ctx) => (c.req.header("Authorization") ?? "").replace(/^Bearer /, "");

/** cursor 는 양의 정수만, limit 는 양의 정수만 인정하고 상한 적용 */
export function pageParams(c: Ctx, defaultLimit: number, maxLimit: number) {
  const cursor = Number(c.req.query("cursor"));
  const lim = Number(c.req.query("limit"));
  return {
    limit: Math.min(Number.isInteger(lim) && lim > 0 ? lim : defaultLimit, maxLimit),
    before: Number.isInteger(cursor) && cursor > 0 ? cursor : Number.MAX_SAFE_INTEGER,
  };
}

export const page = <T extends { id: number }>(rows: T[], limit: number) => {
  const more = rows.length > limit;
  const items = more ? rows.slice(0, limit) : rows;
  return { items, nextCursor: more ? (items.at(-1)?.id ?? null) : null };
};
