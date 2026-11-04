export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_TOKEN?: string;
  IP_PEPPER: string;
  ALLOW_LOCAL?: string;
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
const PHOTO_IP_N = 40;
const PHOTO_DEVICE_MAX = 30;
const PHOTO_IP_MAX = 60;

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


type Photo = { id: number; uuid: string; ext: keyof typeof EXT; w: number; h: number; created_at: number };
const view = (p: Photo, origin: string) => ({
  id: p.id,
  uuid: p.uuid,
  w: p.w,
  h: p.h,
  created_at: p.created_at,
  thumb: `${origin}/p/${p.uuid}/thumb`,
  full: `${origin}/p/${p.uuid}/full`,
});

function sniff(b: Uint8Array): keyof typeof EXT | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  const t = (o: number, s: string) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));
  return t(0, "RIFF") && t(8, "WEBP") ? "webp" : null;
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
        "Cache-Control": "public, max-age=31536000, immutable",
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
    return json({ items: items.map((p) => view(p, url.origin)), nextCursor: more ? items[items.length - 1].id : null }, 200, cors);
  }

  if (!uuid || !UUID.test(uuid)) return bad(cors, "invalid uuid");

  if (req.method === "PUT" && (sub === "full" || sub === "thumb")) {
    if (!DEVICE.test(device)) return bad(cors, "invalid device");
    const len = Number(req.headers.get("Content-Length"));
    if (!Number.isInteger(len) || len <= 0 || len > CAP[sub]) return bad(cors, "too large", 413);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > CAP[sub]) return bad(cors, "too large", 413);
    const ext = sniff(new Uint8Array(buf, 0, Math.min(12, buf.byteLength)));
    if (!ext) return bad(cors, "unsupported type", 415);
    if (await env.DB.prepare("SELECT 1 FROM photos WHERE uuid = ?").bind(uuid).first()) return bad(cors, "exists", 409);
    await env.BUCKET.put(`${sub}/${uuid}.${ext}`, buf, { httpMetadata: { contentType: EXT[ext] } });
    return json(null, 204, cors);
  }

  if (req.method === "POST" && sub === "commit") {
    if (!DEVICE.test(device)) return bad(cors, "invalid device");
    const body = await readJson(req);
    if (!body) return bad(cors, "invalid body");
    const dim = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 20000 ? (v as number) : null);
    const w = dim(body.w);
    const h = dim(body.h);
    if (!w || !h) return bad(cors, "invalid size");
    const pw = body.pw === undefined || body.pw === "" ? null : field(body.pw, 4, 64);
    if (body.pw !== undefined && body.pw !== "" && !pw) return bad(cors, "invalid password");

    const prev = await env.DB.prepare("SELECT id,uuid,ext,w,h,created_at FROM photos WHERE uuid = ?").bind(uuid).first<Photo>();
    if (prev) return json(view(prev, url.origin), 200, cors);

    let ext: keyof typeof EXT | null = null;
    let size = 0;
    for (const e of ["webp", "jpg"] as const) {
      const f = await env.BUCKET.head(`full/${uuid}.${e}`);
      if (f && (await env.BUCKET.head(`thumb/${uuid}.${e}`))) {
        ext = e;
        size = f.size;
        break;
      }
    }
    if (!ext) return bad(cors, "upload incomplete", 409);

    const ipHash = await sha256((req.headers.get("CF-Connecting-IP") ?? "") + env.IP_PEPPER);
    const now = Date.now();
    const n = (sql: string, ...a: unknown[]) => env.DB.prepare(sql).bind(...a).first<{ n: number }>().then((r) => r?.n ?? 0);
    if (
      (await n("SELECT COUNT(*) AS n FROM photos WHERE ip_hash = ? AND created_at > ?", ipHash, now - LIMIT_MS)) >= PHOTO_IP_N ||
      (await n("SELECT COUNT(*) AS n FROM photos WHERE ip_hash = ?", ipHash)) >= PHOTO_IP_MAX ||
      (await n("SELECT COUNT(*) AS n FROM photos WHERE device_id = ?", device)) >= PHOTO_DEVICE_MAX
    ) {
      await Promise.all([`full/${uuid}.${ext}`, `thumb/${uuid}.${ext}`].map((k) => env.BUCKET.delete(k)));
      return bad(cors, "too many uploads", 429);
    }

    const salt = pw ? crypto.getRandomValues(new Uint8Array(16)) : null;
    const hash = pw && salt ? b64(await pbkdf2(pw, salt)) : null;
    const row = await env.DB.prepare(
      "INSERT INTO photos (uuid,ext,w,h,size,pw_hash,salt,ip_hash,device_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id",
    )
      .bind(uuid, ext, w, h, size, hash, salt && b64(salt), ipHash, device, now)
      .first<{ id: number }>();
    return json(view({ id: row!.id, uuid, ext, w, h, created_at: now }, url.origin), 201, cors);
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
      if (!row.pw_hash || !row.salt || !eq(await pbkdf2(pw, unb64(row.salt)), unb64(row.pw_hash))) return bad(cors, "wrong password", 403);
    }
    if (admin && url.searchParams.get("hide") === "1") {
      await env.DB.prepare("UPDATE photos SET hidden = 1 WHERE uuid = ?").bind(uuid).run();
    } else {
      await Promise.all([`full/${uuid}.${row.ext}`, `thumb/${uuid}.${row.ext}`].map((k) => env.BUCKET.delete(k)));
      await env.DB.prepare("DELETE FROM photos WHERE uuid = ?").bind(uuid).run();
    }
    ctx.waitUntil(Promise.all(["full", "thumb"].map((k) => caches.default.delete(`${url.origin}/p/${uuid}/${k}`))));
    return json(null, 204, cors);
  }

  return bad(cors, "method not allowed", 405);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = allowedOrigin(req.headers.get("Origin"), env);
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
    if (!m) return (await photos(req, env, ctx, url, cors)) ?? json({ error: "not found" }, 404, cors);
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

      const ipHash = await sha256((req.headers.get("CF-Connecting-IP") ?? "") + env.IP_PEPPER);
      const now = Date.now();
      const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM entries WHERE ip_hash = ? AND created_at > ?")
        .bind(ipHash, now - LIMIT_MS)
        .first<{ n: number }>();
      if ((recent?.n ?? 0) >= LIMIT_N) return bad(cors, "too many posts", 429);

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await pbkdf2(password, salt);
      const row = await env.DB.prepare(
        "INSERT INTO entries (name,message,pw_hash,salt,ip_hash,created_at) VALUES (?,?,?,?,?,?) RETURNING id",
      )
        .bind(name, message, b64(hash), b64(salt), ipHash, now)
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
  },
};
