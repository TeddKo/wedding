export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_TOKEN?: string;
  IP_PEPPER: string;
  ALLOW_LOCAL?: string;
  VOTE_MODE?: string;
  VOTER_PEPPER?: string;
  SESSION_SECRET?: string;
  KAKAO_REST_KEY?: string;
  KAKAO_CLIENT_SECRET?: string;
  KAKAO_MOCK?: string;
  ORPHAN_MS?: string;
}

const ORIGIN = "https://teddko.github.io";
const MAX_BODY = 4096;
const LIMIT_N = 5;
const LIMIT_MS = 10 * 60 * 1000;
const enc = new TextEncoder();

const CAP = { full: 3 * 1024 * 1024, thumb: 200 * 1024 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DEVICE = /^[\w-]{8,64}$/;
const EXT = { webp: "image/webp", jpg: "image/jpeg" } as const;
const PHOTO_IP_N = 200;
const PHOTO_DEVICE_MAX = 30;
const PW_FAIL_N = 10;
const ORPHAN_MS = 24 * 3600 * 1000;
const DIM = { full: 2560, thumb: 480 };
const DIM_TOLERANCE = 2;

const b64 = (b: Uint8Array | ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(pw: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256),
  );
}

async function sha256(s: string) {
  return b64(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

/** IPv6 는 /64 앞 4그룹만 쓴다(한 가정·회선이 /64 를 통째로 받으므로) */
function ipKey(ip: string) {
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head, tail] = ip.split("::");
  const g = head ? head.split(":") : [];
  while (tail !== undefined && g.length < 4) g.push("0");
  return g.slice(0, 4).map((x) => parseInt(x || "0", 16).toString(16)).join(":");
}

const ipHash = (req: Request, env: Env) => sha256(ipKey(req.headers.get("CF-Connecting-IP") ?? "") + env.IP_PEPPER);

function eq(a: Uint8Array, b: Uint8Array) {
  let d = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ (b[i] ?? 0);
  return d === 0;
}

function allowedOrigin(o: string | null, env: Env) {
  if (!o) return null;
  if (o === ORIGIN) return o;
  if (env.ALLOW_LOCAL === "1" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o)) return o;
  return null;
}

function json(body: unknown, status: number, cors: string | null) {
  const h: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (cors) h["Access-Control-Allow-Origin"] = cors;
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: h });
}

const bad = (cors: string | null, msg: string, status = 400) => json({ error: msg }, status, cors);
const hasCtrl = (s: string) => /[\u0000-\u001f\u007f-\u009f]/.test(s);

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const buf = await req.arrayBuffer();
  if (buf.byteLength > MAX_BODY) return null;
  try {
    const v = JSON.parse(new TextDecoder().decode(buf));
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

const field = (v: unknown, min: number, max: number, multiline = false) => {
  if (typeof v !== "string") return null;
  let t = v.trim();
  if (multiline) t = t.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const checked = multiline ? t.replace(/\n/g, "") : t;
  return t.length >= min && t.length <= max && !hasCtrl(checked) ? t : null;
};


const POLL = { max: 20, perCreator: 2, ipN: 5, len: 30, session: 30 * 24 * 3600 * 1000 };
const REDIRECT = "https://teddko.github.io/wedding/";
const b64u = (b: Uint8Array) => b64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => unb64(s.replace(/-/g, "+").replace(/_/g, "/"));

async function hmac(secret: string | undefined, msg: string) {
  if (!secret) throw new Error("secret missing");
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}

async function sign(vk: string, env: Env) {
  const p = b64u(enc.encode(JSON.stringify({ vk, exp: Date.now() + POLL.session })));
  return `${p}.${b64u(await hmac(env.SESSION_SECRET, p))}`;
}

async function verify(req: Request, env: Env): Promise<string | null> {
  const [p, s, extra] = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").split(".");
  if (!p || !s || extra !== undefined) return null;
  try {
    if (!eq(unb64u(s), await hmac(env.SESSION_SECRET, p))) return null;
    const { vk, exp } = JSON.parse(new TextDecoder().decode(unb64u(p)));
    if (typeof vk !== "string" || typeof exp !== "number" || exp <= Date.now()) return null;
    return env.VOTE_MODE !== "device" && vk.startsWith("device:") ? null : vk;
  } catch {
    return null;
  }
}

async function kakaoId(code: string, redirectUri: string, env: Env): Promise<string | null> {
  const mock = env.ALLOW_LOCAL === "1" ? env.KAKAO_MOCK : undefined;
  const t = await fetch(`${mock ?? "https://kauth.kakao.com"}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.KAKAO_REST_KEY ?? "",
      redirect_uri: redirectUri,
      code,
      client_secret: env.KAKAO_CLIENT_SECRET ?? "",
    }),
  });
  const tok = t.ok ? ((await t.json()) as { access_token?: string }).access_token : null;
  if (!tok) return null;
  const i = await fetch(`${mock ?? "https://kapi.kakao.com"}/v1/user/access_token_info`, { headers: { Authorization: `Bearer ${tok}` } });
  const id = i.ok ? ((await i.json()) as { id?: number | string }).id : null;
  return typeof id === "number" || typeof id === "string" ? String(id) : null;
}

async function poll(req: Request, env: Env, url: URL, cors: string | null): Promise<Response | null> {
  const m = url.pathname.match(/^\/(auth\/(?:kakao|device)|poll(?:\/(?:options(?:\/(\d+))?|vote))?)\/?$/);
  if (!m) return null;
  const route = m[1].replace(/\/\d+$/, "");
  const oid = m[2];
  const device = env.VOTE_MODE === "device";

  const results = async (vk: string | null) => {
    const { results: rows } = await env.DB.prepare(
      "SELECT o.id,o.text,o.creator_key,COUNT(v.voter_key) AS votes FROM poll_options o LEFT JOIN poll_votes v ON v.option_id = o.id WHERE o.hidden = 0 GROUP BY o.id ORDER BY votes DESC, o.id ASC",
    ).all<{ id: number; text: string; creator_key: string; votes: number }>();
    const mine = vk ? await env.DB.prepare("SELECT option_id FROM poll_votes WHERE voter_key = ?").bind(vk).first<{ option_id: number }>() : null;
    return {
      mode: device ? "device" : "kakao",
      options: rows.map((o) => ({ id: o.id, text: o.text, votes: o.votes, mine: !!vk && o.creator_key === vk })),
      total: rows.reduce((a, o) => a + o.votes, 0),
      myVote: mine?.option_id ?? null,
    };
  };

  if (route === "poll" && req.method === "GET") return json(await results(await verify(req, env)), 200, cors);

  if (route === "auth/device" && req.method === "POST") {
    if (!device) return bad(cors, "not found", 404);
    return json({ token: await sign(`device:${crypto.randomUUID()}`, env) }, 200, cors);
  }

  if (route === "auth/kakao" && req.method === "POST") {
    const body = await readJson(req);
    const code = body && field(body.code, 1, 512);
    const redirectUri = body && typeof body.redirectUri === "string" ? body.redirectUri : "";
    const okUri = redirectUri === REDIRECT || (env.ALLOW_LOCAL === "1" && /^http:\/\/(localhost|127\.0\.0\.1):\d+\/wedding\/$/.test(redirectUri));
    if (!code || !okUri) return bad(cors, "invalid body");
    let id: string | null;
    try {
      id = await kakaoId(code, redirectUri, env);
    } catch {
      return bad(cors, "kakao unavailable", 502);
    }
    if (!id) return bad(cors, "kakao", 401);
    return json({ token: await sign(b64u(await hmac(env.VOTER_PEPPER, `kakao:${id}`)), env) }, 200, cors);
  }

  if (route === "poll/options" && oid && req.method === "DELETE") {
    const t = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    if (!env.ADMIN_TOKEN || !t || !eq(enc.encode(t), enc.encode(env.ADMIN_TOKEN))) return bad(cors, "forbidden", 403);
    await env.DB.prepare("UPDATE poll_options SET hidden = 1 WHERE id = ?").bind(Number(oid)).run();
    return json(null, 204, cors);
  }

  if ((route === "poll/options" && !oid && req.method === "POST") || (route === "poll/vote" && req.method === "POST")) {
    const vk = await verify(req, env);
    if (!vk) return bad(cors, "unauthorized", 401);
    const body = await readJson(req);
    if (!body) return bad(cors, "invalid body");
    const now = Date.now();
    const n = (sql: string, ...a: unknown[]) => env.DB.prepare(sql).bind(...a).first<{ n: number }>().then((r) => r?.n ?? 0);

    if (route === "poll/vote") {
      const optionId = body.optionId;
      if (!Number.isInteger(optionId)) return bad(cors, "invalid option");
      if (!(await n("SELECT COUNT(*) AS n FROM poll_options WHERE id = ? AND hidden = 0", optionId))) return bad(cors, "not found", 404);
      const r = await env.DB.prepare("INSERT INTO poll_votes (voter_key,option_id,created_at) VALUES (?,?,?) ON CONFLICT(voter_key) DO NOTHING")
        .bind(vk, optionId, now)
        .run();
      const out = await results(vk);
      return r.meta.changes ? json(out, 200, cors) : json({ error: "already", ...out }, 409, cors);
    }

    const raw = typeof body.text === "string" ? body.text.normalize("NFKC") : "";
    const text = raw && !hasCtrl(raw) && !/\p{Cf}/u.test(raw) ? field(raw.replace(/\s+/g, " "), 1, POLL.len) : null;
    if (!text) return bad(cors, "invalid text");
    const ip = await ipHash(req, env);
    if ((await n("SELECT COUNT(*) AS n FROM poll_options WHERE ip_hash = ? AND created_at > ?", ip, now - LIMIT_MS)) >= POLL.ipN) return bad(cors, "too many", 429);
    if ((await n("SELECT COUNT(*) AS n FROM poll_options WHERE hidden = 0")) >= POLL.max) return bad(cors, "full", 409);
    if ((await n("SELECT COUNT(*) AS n FROM poll_options WHERE creator_key = ?", vk)) >= POLL.perCreator) return bad(cors, "limit", 409);
    const row = await env.DB.prepare("INSERT INTO poll_options (text,norm,creator_key,ip_hash,created_at) VALUES (?,?,?,?,?) ON CONFLICT(norm) DO NOTHING RETURNING id")
      .bind(text, text.toLowerCase(), vk, ip, now)
      .first<{ id: number }>();
    if (!row) return bad(cors, "duplicate", 409);
    return json({ ...(await results(vk)), created: row.id }, 201, cors);
  }

  return bad(cors, "method not allowed", 405);
}

const IMMUTABLE = "public, max-age=31536000, immutable";
type Photo = { id: number; uuid: string; ext: keyof typeof EXT; w: number; h: number; created_at: number };
const view = (p: Photo, origin: string) => ({
  id: p.id,
  uuid: p.uuid,
  w: p.w,
  h: p.h,
  created_at: p.created_at,
  ext: p.ext,
  thumb: `${origin}/p/${p.uuid}/thumb`,
  full: `${origin}/p/${p.uuid}/full`,
});

function sniff(b: Uint8Array): keyof typeof EXT | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  const t = (o: number, s: string) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));
  return t(0, "RIFF") && t(8, "WEBP") ? "webp" : null;
}

/** JPEG SOF0/1/2, WebP VP8/VP8L/VP8X 헤더에서 가로·세로를 읽는다. 실패하면 null */
function dims(b: Uint8Array, ext: keyof typeof EXT): [number, number] | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ok = (w: number, h: number): [number, number] | null => (w >= 1 && h >= 1 ? [w, h] : null);
  if (ext === "jpg") {
    for (let i = 2; i + 9 <= b.length; ) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xc0 || m === 0xc1 || m === 0xc2) return ok(v.getUint16(i + 7), v.getUint16(i + 5));
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      i += 2 + v.getUint16(i + 2);
    }
    return null;
  }
  if (b.length < 30) return null;
  const tag = String.fromCharCode(...b.subarray(12, 16));
  if (tag === "VP8 ") return b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a ? ok(v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff) : null;
  if (tag === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = v.getUint32(21, true);
    return ok((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (tag === "VP8X") return ok((b[24] | (b[25] << 8) | (b[26] << 16)) + 1, (b[27] | (b[28] << 8) | (b[29] << 16)) + 1);
  return null;
}

/** 24시간(ORPHAN_MS) 넘게 커밋되지 않은 업로드의 R2 객체와 행을 지우고, 만료된 비밀번호 실패 기록을 정리한다 */
async function sweep(env: Env) {
  const cutoff = Date.now() - (Number(env.ORPHAN_MS) || ORPHAN_MS);
  const { results } = await env.DB.prepare(
    "SELECT uuid,ext FROM uploads WHERE created_at < ? AND uuid NOT IN (SELECT uuid FROM photos) LIMIT 500",
  )
    .bind(cutoff)
    .all<{ uuid: string; ext: string }>();
  if (results.length) {
    await env.BUCKET.delete(results.flatMap((r) => [`full/${r.uuid}.${r.ext}`, `thumb/${r.uuid}.${r.ext}`]));
    await env.DB.batch(results.map((r) => env.DB.prepare("DELETE FROM uploads WHERE uuid = ?").bind(r.uuid)));
  }
  await env.DB.prepare("DELETE FROM pw_fails WHERE created_at < ?").bind(Date.now() - 3600 * 1000).run();
}

async function photos(req: Request, env: Env, ctx: ExecutionContext, url: URL, cors: string | null): Promise<Response | null> {
  const img = url.pathname.match(/^\/p\/([^/]+)\/(full|thumb)$/);
  if (img) {
    if (req.method !== "GET") return bad(cors, "method not allowed", 405);
    const [, uuid, kind] = img;
    const etag = `"${uuid}-${kind}"`;
    const hit = await caches.default.match(url.origin + url.pathname);
    if (hit) return hit;
    const row = UUID.test(uuid)
      ? await env.DB.prepare("SELECT ext FROM photos WHERE uuid = ? AND hidden = 0").bind(uuid).first<{ ext: keyof typeof EXT }>()
      : null;
    const obj = row && (await env.BUCKET.get(`${kind}/${uuid}.${row.ext}`));
    if (!obj) return bad(cors, "not found", 404);
    const res = new Response(obj.body, {
      headers: {
        "Content-Type": EXT[row.ext],
        "Cache-Control": IMMUTABLE,
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
    ctx.waitUntil(caches.default.put(url.origin + url.pathname, res.clone()));
    return res;
  }

  const m = url.pathname.match(/^\/photos(?:\/([^/]+)(?:\/([^/]+))?)?\/?$/);
  if (!m) return null;
  const [, uuid, sub] = m;
  const device = req.headers.get("X-Device") ?? "";

  if (!uuid && req.method === "GET") {
    const cursor = Number(url.searchParams.get("cursor"));
    const lim = Number(url.searchParams.get("limit"));
    const limit = Math.min(Number.isInteger(lim) && lim > 0 ? lim : 30, 30);
    const before = Number.isInteger(cursor) && cursor > 0 ? cursor : Number.MAX_SAFE_INTEGER;
    const { results } = await env.DB.prepare(
      "SELECT id,uuid,ext,w,h,created_at FROM photos WHERE hidden = 0 AND id < ? ORDER BY id DESC LIMIT ?",
    )
      .bind(before, limit + 1)
      .all<Photo>();
    const more = results.length > limit;
    const items = more ? results.slice(0, limit) : results;
    const total = before === Number.MAX_SAFE_INTEGER ? (await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE hidden = 0").first<{ n: number }>())?.n ?? 0 : undefined;
    return json({ items: items.map((p) => view(p, url.origin)), nextCursor: more ? items[items.length - 1].id : null, total }, 200, cors);
  }

  if (!uuid || !UUID.test(uuid)) return bad(cors, "invalid uuid");

  if (req.method === "PUT" && (sub === "full" || sub === "thumb")) {
    if (!DEVICE.test(device)) return bad(cors, "invalid device");
    const len = Number(req.headers.get("Content-Length"));
    if (!Number.isInteger(len) || len <= 0 || len > CAP[sub]) return bad(cors, "too large", 413);
    if (await env.DB.prepare("SELECT 1 FROM photos WHERE uuid = ?").bind(uuid).first()) return bad(cors, "exists", 409);
    const ip = await ipHash(req, env);
    const known = await env.DB.prepare("SELECT ext FROM uploads WHERE uuid = ?").bind(uuid).first<{ ext: string }>();
    if (!known) {
      const n = (sql: string, ...a: unknown[]) => env.DB.prepare(sql).bind(...a).first<{ n: number }>().then((r) => r?.n ?? 0);
      if (
        (await n("SELECT COUNT(*) AS n FROM uploads WHERE ip_hash = ? AND created_at > ?", ip, Date.now() - LIMIT_MS)) >= PHOTO_IP_N ||
        (await n("SELECT COUNT(*) AS n FROM uploads WHERE device_id = ?", device)) >= PHOTO_DEVICE_MAX
      ) return bad(cors, "too many uploads", 429);
    }
    const buf = await req.arrayBuffer();
    if (buf.byteLength > CAP[sub]) return bad(cors, "too large", 413);
    const bytes = new Uint8Array(buf);
    const ext = sniff(bytes.subarray(0, 12));
    if (!ext) return bad(cors, "unsupported type", 415);
    const d = dims(bytes, ext);
    if (!d || Math.max(...d) > DIM[sub] + DIM_TOLERANCE) return bad(cors, "invalid dimensions", 422);
    await env.DB.prepare("INSERT OR IGNORE INTO uploads (uuid,ext,ip_hash,device_id,created_at) VALUES (?,?,?,?,?)").bind(uuid, ext, ip, device, Date.now()).run();
    const rec = await env.DB.prepare("SELECT ext FROM uploads WHERE uuid = ?").bind(uuid).first<{ ext: string }>();
    if (rec?.ext !== ext) return bad(cors, "type mismatch", 409);
    await env.BUCKET.put(`${sub}/${uuid}.${ext}`, buf, { httpMetadata: { contentType: EXT[ext], cacheControl: IMMUTABLE } });
    await env.DB.prepare(`UPDATE uploads SET ${sub === "full" ? "fw=?,fh=?" : "tw=?,th=?"} WHERE uuid = ?`).bind(d[0], d[1], uuid).run();
    return json(null, 204, cors);
  }

  if (req.method === "POST" && sub === "commit") {
    if (!DEVICE.test(device)) return bad(cors, "invalid device");
    const body = await readJson(req);
    if (!body) return bad(cors, "invalid body");
    const pw = body.pw === undefined || body.pw === "" ? null : field(body.pw, 4, 64);
    if (body.pw !== undefined && body.pw !== "" && !pw) return bad(cors, "invalid password");

    const find = () => env.DB.prepare("SELECT id,uuid,ext,w,h,created_at FROM photos WHERE uuid = ?").bind(uuid).first<Photo>();
    const prev = await find();
    if (prev) return json(view(prev, url.origin), 200, cors);

    const up = await env.DB.prepare("SELECT ext,ip_hash,device_id,fw,fh,tw FROM uploads WHERE uuid = ?")
      .bind(uuid)
      .first<{ ext: keyof typeof EXT; ip_hash: string; device_id: string | null; fw: number | null; fh: number | null; tw: number | null }>();
    const full = up && up.fw && up.tw ? await env.BUCKET.head(`full/${uuid}.${up.ext}`) : null;
    if (!up || !full || !(await env.BUCKET.head(`thumb/${uuid}.${up.ext}`))) return bad(cors, "upload incomplete", 409);

    const now = Date.now();
    const salt = pw ? crypto.getRandomValues(new Uint8Array(16)) : null;
    const hash = pw && salt ? b64(await pbkdf2(pw, salt)) : null;
    const row = await env.DB.prepare(
      "INSERT INTO photos (uuid,ext,w,h,size,pw_hash,salt,ip_hash,device_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(uuid) DO NOTHING RETURNING id",
    )
      .bind(uuid, up.ext, up.fw, up.fh, full.size, hash, salt && b64(salt), up.ip_hash, up.device_id ?? device, now)
      .first<{ id: number }>();
    if (!row) {
      const again = await find();
      return again ? json(view(again, url.origin), 200, cors) : bad(cors, "upload incomplete", 409);
    }
    return json(view({ id: row.id, uuid, ext: up.ext, w: up.fw!, h: up.fh!, created_at: now }, url.origin), 201, cors);
  }

  if (req.method === "DELETE" && !sub) {
    const row = await env.DB.prepare("SELECT ext,pw_hash,salt FROM photos WHERE uuid = ?")
      .bind(uuid)
      .first<{ ext: string; pw_hash: string | null; salt: string | null }>();
    if (!row) return bad(cors, "not found", 404);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const admin = !!env.ADMIN_TOKEN && !!token && eq(enc.encode(token), enc.encode(env.ADMIN_TOKEN));
    if (!admin) {
      const body = await readJson(req);
      const pw = body && typeof body.pw === "string" ? body.pw.trim() : "";
      if (!pw) return bad(cors, "invalid password");
      const ip = await ipHash(req, env);
      const fails = await env.DB.prepare("SELECT COUNT(*) AS n FROM pw_fails WHERE ip_hash = ? AND created_at > ?").bind(ip, Date.now() - LIMIT_MS).first<{ n: number }>();
      if ((fails?.n ?? 0) >= PW_FAIL_N) return bad(cors, "too many attempts", 429);
      if (!row.pw_hash || !row.salt || !eq(await pbkdf2(pw, unb64(row.salt)), unb64(row.pw_hash))) {
        await env.DB.prepare("INSERT INTO pw_fails (ip_hash,created_at) VALUES (?,?)").bind(ip, Date.now()).run();
        return bad(cors, "wrong password", 403);
      }
    }
    await env.DB.prepare("DELETE FROM uploads WHERE uuid = ?").bind(uuid).run();
    await Promise.all([`full/${uuid}.${row.ext}`, `thumb/${uuid}.${row.ext}`].map((k) => env.BUCKET.delete(k)));
    if (admin && url.searchParams.get("hide") === "1") {
      await env.DB.prepare("UPDATE photos SET hidden = 1 WHERE uuid = ?").bind(uuid).run();
    } else {
      await env.DB.prepare("DELETE FROM photos WHERE uuid = ?").bind(uuid).run();
    }
    ctx.waitUntil(Promise.all(["full", "thumb"].map((k) => caches.default.delete(`${url.origin}/p/${uuid}/${k}`))));
    return json(null, 204, cors);
  }

  return bad(cors, "method not allowed", 405);
}

async function handle(req: Request, env: Env, ctx: ExecutionContext, cors: string | null): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/entries(?:\/(\d+))?\/?$/);

    if (req.method === "OPTIONS") {
      const h: Record<string, string> = { "Cache-Control": "no-store", Vary: "Origin" };
      if (cors) {
        h["Access-Control-Allow-Origin"] = cors;
        h["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
        h["Access-Control-Allow-Headers"] = "Content-Type, X-Device, Authorization";
        h["Access-Control-Max-Age"] = "86400";
      }
      return new Response(null, { status: 204, headers: h });
    }
    if (!m) return (await poll(req, env, url, cors)) ?? (await photos(req, env, ctx, url, cors)) ?? json({ error: "not found" }, 404, cors);
    const id = m[1];

    if (!id && req.method === "GET") {
      const cursor = Number(url.searchParams.get("cursor"));
      const lim = Number(url.searchParams.get("limit"));
      const limit = Math.min(Number.isInteger(lim) && lim > 0 ? lim : 10, 30);
      const before = Number.isInteger(cursor) && cursor > 0 ? cursor : Number.MAX_SAFE_INTEGER;
      const { results } = await env.DB.prepare(
        "SELECT id,name,message,created_at FROM entries WHERE id < ? ORDER BY id DESC LIMIT ?",
      )
        .bind(before, limit + 1)
        .all<{ id: number }>();
      const more = results.length > limit;
      const items = more ? results.slice(0, limit) : results;
      return json({ items, nextCursor: more ? items[items.length - 1].id : null }, 200, cors);
    }

    if (!id && req.method === "POST") {
      const body = await readJson(req);
      if (!body) return bad(cors, "invalid body");
      const name = field(body.name, 1, 20);
      const message = field(body.message, 1, 300, true);
      const password = field(body.password, 4, 64);
      if (!name) return bad(cors, "invalid name");
      if (!message) return bad(cors, "invalid message");
      if (!password) return bad(cors, "invalid password");

      const ip = await ipHash(req, env);
      const now = Date.now();
      const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM entries WHERE ip_hash = ? AND created_at > ?")
        .bind(ip, now - LIMIT_MS)
        .first<{ n: number }>();
      if ((recent?.n ?? 0) >= LIMIT_N) return bad(cors, "too many posts", 429);

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await pbkdf2(password, salt);
      const row = await env.DB.prepare(
        "INSERT INTO entries (name,message,pw_hash,salt,ip_hash,created_at) VALUES (?,?,?,?,?,?) RETURNING id",
      )
        .bind(name, message, b64(hash), b64(salt), ip, now)
        .first<{ id: number }>();
      return json({ id: row!.id, name, message, created_at: now }, 201, cors);
    }

    if (id && req.method === "DELETE") {
      const body = await readJson(req);
      const password = body && typeof body.password === "string" ? body.password.trim() : "";
      if (!password) return bad(cors, "invalid password");
      const row = await env.DB.prepare("SELECT pw_hash, salt FROM entries WHERE id = ?")
        .bind(Number(id))
        .first<{ pw_hash: string; salt: string }>();
      if (!row) return bad(cors, "not found", 404);
      if (!eq(await pbkdf2(password, unb64(row.salt)), unb64(row.pw_hash))) return bad(cors, "wrong password", 403);
      await env.DB.prepare("DELETE FROM entries WHERE id = ?").bind(Number(id)).run();
      return json(null, 204, cors);
    }

    return bad(cors, "method not allowed", 405);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = allowedOrigin(req.headers.get("Origin"), env);
    try {
      return await handle(req, env, ctx, cors);
    } catch {
      return json({ error: "server error" }, 500, cors);
    }
  },
  async scheduled(_e: ScheduledController, env: Env): Promise<void> {
    await sweep(env);
  },
};
