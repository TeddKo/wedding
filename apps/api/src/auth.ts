import type { Context } from "hono";
import { b64u, hmacSign, hmacVerify, safeEqStr, unb64u } from "./domain/crypto";
import type { AppEnv, Env } from "./env";
import { fail } from "./errors";
import { bearer } from "./http";
import { SESSION_MS } from "./limits";

type Ctx = Context<AppEnv>;
const enc = new TextEncoder();

/** 토큰 형식: b64u(JSON{vk,exp}).b64u(HMAC-SHA256) */
export async function sign(vk: string, env: Env) {
  const p = b64u(enc.encode(JSON.stringify({ vk, exp: Date.now() + SESSION_MS })));
  return `${p}.${b64u(await hmacSign(env.SESSION_SECRET, p))}`;
}

/** 유효한 세션이면 voter key, 아니면 null */
export async function session(c: Ctx): Promise<string | null> {
  const [p, s, extra] = bearer(c).split(".");
  if (!p || !s || extra !== undefined) return null;
  try {
    if (!(await hmacVerify(c.env.SESSION_SECRET, unb64u(s), p))) return null;
    const { vk, exp } = JSON.parse(new TextDecoder().decode(unb64u(p)));
    if (typeof vk !== "string" || typeof exp !== "number" || exp <= Date.now()) return null;
    return c.env.VOTE_MODE !== "device" && vk.startsWith("device:") ? null : vk;
  } catch {
    return null;
  }
}

export async function requireSession(c: Ctx) {
  return (await session(c)) ?? fail(401, "unauthorized");
}

/** 경로 미들웨어가 아닌 핸들러 안에서 호출 */
export async function isAdmin(c: Ctx) {
  const t = bearer(c);
  return !!c.env.ADMIN_TOKEN && !!t && (await safeEqStr(t, c.env.ADMIN_TOKEN));
}
