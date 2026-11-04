import { env, exports } from "cloudflare:workers";
import worker from "../src/index";

export const BASE = "https://api.test";
export const OK = "https://teddko.github.io";
export const SECRET = "test-session-secret";
export const REDIR = "https://teddko.github.io/wedding/";

export const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CallOpts = { method?: string; body?: unknown; ip?: string; origin?: string | null; token?: string; headers?: Record<string, string> };

/** 기본 환경으로 Worker 호출 */
export const call = (path: string, { method = "GET", body, ip = "1.1.1.1", origin = OK, token, headers = {} }: CallOpts = {}) =>
  exports.default.fetch(
    new Request(BASE + path, {
      method,
      headers: {
        "content-type": "application/json",
        "CF-Connecting-IP": ip,
        ...(origin ? { Origin: origin } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

/** env 일부를 덮어쓴 채 Worker 호출(카카오 모드 등) */
export const callWith = (override: Record<string, unknown>, path: string, { method = "GET", body, token }: CallOpts = {}) => {
  const e = { ...env, ...override } as typeof env;
  const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
  return worker.fetch(
    new Request(BASE + path, {
      method,
      headers: { "content-type": "application/json", Origin: OK, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    e,
    ctx,
  );
};

export const r2keys = async () => {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const l = await env.BUCKET.list({ cursor });
    keys.push(...l.objects.map((o) => o.key));
    cursor = l.truncated ? l.cursor : undefined;
  } while (cursor);
  return keys;
};

const b64url = (b: ArrayBuffer | string) => {
  const s = typeof b === "string" ? btoa(unescape(encodeURIComponent(b))) : btoa(String.fromCharCode(...new Uint8Array(b)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** 세션 토큰 직접 발급(b64u(JSON).b64u(HMAC)) */
export async function mint(obj: unknown, secret = SECRET) {
  const p = b64url(JSON.stringify(obj));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${p}.${b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(p)))}`;
}

export const payloadOf = (token: string) => {
  const p = (token.split(".")[0] ?? "").replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(p)));
};
