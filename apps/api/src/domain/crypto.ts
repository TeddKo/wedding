const enc = new TextEncoder();

export const b64 = (b: Uint8Array | ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
export const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const b64u = (b: Uint8Array) => b64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = (s: string) => unb64(s.replace(/-/g, "+").replace(/_/g, "/"));

export async function pbkdf2(pw: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256));
}

export async function sha256(s: string) {
  return b64(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

/** 길이가 같은 바이트열의 상수 시간 비교 */
export const safeEqBytes = (a: Uint8Array, b: Uint8Array) => a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);

/** 다이제스트 비교로 길이 노출 차단 */
export async function safeEqStr(a: string, b: string) {
  const [x, y] = await Promise.all([a, b].map(async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))));
  return safeEqBytes(x!, y!);
}

/** 키는 요청마다 비추출 형태로 생성 */
async function hmacKey(secret: string | undefined, usage: "sign" | "verify") {
  if (!secret) throw new Error("secret missing");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function hmacSign(secret: string | undefined, msg: string) {
  return new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(msg)));
}

export async function hmacVerify(secret: string | undefined, sig: Uint8Array, msg: string) {
  return crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sig, enc.encode(msg));
}

/** IPv6 는 /64 앞 4그룹만 사용(한 가정·회선이 /64 를 통째로 받으므로) */
export function ipKey(ip: string) {
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head, tail] = ip.split("::");
  const g = head ? head.split(":") : [];
  while (tail !== undefined && g.length < 4) g.push("0");
  return g
    .slice(0, 4)
    .map((x) => Number.parseInt(x || "0", 16).toString(16))
    .join(":");
}
