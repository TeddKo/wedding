// 로컬 wrangler dev 를 띄워 fetch 로 검증. 사용: pnpm test
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHmac } from "node:crypto";

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const OK = "https://teddko.github.io";
const persist = mkdtempSync(join(tmpdir(), "gb-"));
const varsFile = join(persist, ".dev.vars");
const KMOCK = 8798;
const SECRET = "test-session-secret";
writeFileSync(varsFile, `IP_PEPPER=test-pepper\nADMIN_TOKEN=test-admin\nVOTE_MODE=device\nVOTER_PEPPER=test-voter\nSESSION_SECRET=${SECRET}\nKAKAO_REST_KEY=rk\nKAKAO_CLIENT_SECRET=cs\nKAKAO_MOCK=http://127.0.0.1:${KMOCK}\n`);
const kseen = [];
const kmock = createServer(async (rq, rs) => {
  const raw = rq.method === "POST" ? await new Promise((r) => { let b = ""; rq.on("data", (c) => (b += c)); rq.on("end", () => r(b)); }) : "";
  const q = new URLSearchParams(raw);
  rs.setHeader("content-type", "application/json");
  if (rq.url === "/oauth/token") {
    kseen.push(Object.fromEntries(q));
    const ok = q.get("code")?.startsWith("ok-");
    rs.statusCode = ok ? 200 : 400;
    rs.end(JSON.stringify(ok ? { access_token: "at-" + q.get("code").slice(3) } : { error: "invalid_grant" }));
  } else if (rq.url === "/v1/user/access_token_info") {
    const at = (rq.headers.authorization ?? "").replace("Bearer at-", "");
    rs.end(JSON.stringify({ id: Number(at) }));
  } else { rs.statusCode = 404; rs.end("{}"); }
}).listen(KMOCK, "127.0.0.1");
const w = (...a) => ["wrangler", ...a, "--env", "dev", "--persist-to", persist];

execFileSync("npx", ["--no-install", ...w("d1", "migrations", "apply", "wedding-guestbook", "--local")], { stdio: "ignore" });
const dev = spawn("npx", ["--no-install", ...w("dev", "--local", "--port", String(PORT), "--env-file", varsFile)], { stdio: "ignore" });

const call = (path, { method = "GET", body, ip = "1.1.1.1", origin = OK } = {}) =>
  fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip, ...(origin ? { Origin: origin } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const post = (b, ip) => call("/entries", { method: "POST", body: b, ip });
const good = { name: " 홍길동 ", message: " 축하해요 ", password: "pw1234" };

try {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + "/x"); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }

  const ids = [];
  for (let i = 0; i < 3; i++) {
    const r = await post({ ...good, message: `m${i}` }, "9.9.9.9");
    assert.equal(r.status, 201);
    assert.match(r.headers.get("content-type"), /application\/json; charset=utf-8/);
    assert.equal(r.headers.get("cache-control"), "no-store");
    const j = await r.json();
    assert.equal(j.name, "홍길동");
    assert.deepEqual(Object.keys(j).sort(), ["created_at", "id", "message", "name"]);
    ids.push(j.id);
  }
  let j = await (await call("/entries?limit=2")).json();
  assert.deepEqual(j.items.map((x) => x.id), [ids[2], ids[1]]);
  assert.equal(j.nextCursor, ids[1]);
  assert.ok(!JSON.stringify(j).match(/pw_hash|salt|ip_hash/));
  j = await (await call(`/entries?limit=2&cursor=${j.nextCursor}`)).json();
  assert.deepEqual(j.items.map((x) => x.id), [ids[0]]);
  assert.equal(j.nextCursor, null);

  for (const b of [
    { ...good, name: "" }, { ...good, name: "a".repeat(21) }, { ...good, message: "a".repeat(301) },
    { ...good, message: "  " }, { ...good, password: "abc" }, { ...good, name: "a\u0000b" },
    { ...good, message: "a\u0007b" }, { ...good, name: "a\nb" }, { name: "a" },
  ]) assert.equal((await post(b, "8.8.8.8")).status, 400, JSON.stringify(b));
  const ml = await (await post({ ...good, message: "첫 줄\r\n\r\n\r\n\r\n둘째 줄" }, "6.6.6.6")).json();
  assert.equal(ml.message, "첫 줄\n\n둘째 줄");
  assert.equal((await post({ ...good, message: "x".repeat(5000) }, "8.8.8.8")).status, 400);

  assert.equal((await call(`/entries/${ids[0]}`, { method: "DELETE", body: { password: "nope" } })).status, 403);
  assert.equal((await call(`/entries/${ids[0]}`, { method: "DELETE", body: { password: "pw1234" } })).status, 204);
  assert.equal((await call(`/entries/${ids[0]}`, { method: "DELETE", body: { password: "pw1234" } })).status, 404);
  assert.equal((await call("/nope")).status, 404);

  const s = [];
  for (let i = 0; i < 6; i++) s.push((await post(good, "7.7.7.7")).status);
  assert.deepEqual(s, [201, 201, 201, 201, 201, 429]);

  assert.equal((await call("/entries")).headers.get("access-control-allow-origin"), OK);
  assert.equal((await call("/entries", { origin: "https://evil.example" })).headers.get("access-control-allow-origin"), null);
  assert.equal((await call("/entries", { origin: "https://teddko.github.io.evil.example" })).headers.get("access-control-allow-origin"), null);
  const pre = await call("/entries", { method: "OPTIONS" });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-origin"), OK);
  assert.equal((await call("/entries", { method: "OPTIONS", origin: "https://evil.example" })).headers.get("access-control-allow-origin"), null);
  assert.equal((await call("/entries", { origin: "http://localhost:4321" })).headers.get("access-control-allow-origin"), "http://localhost:4321");

  /* ---------- 스냅샷 ---------- */
  const jpg = (n) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n - 4, 7)]);
  const webp = (n) => Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(n - 12, 7)]);
  const dev = (d) => ({ "X-Device": d });
  const put = (u, kind, body, { d = "device-aaaaaaaa", ip = "2.2.2.2", origin = OK, len } = {}) =>
    fetch(`${BASE}/photos/${u}/${kind}`, {
      method: "PUT",
      headers: { "CF-Connecting-IP": ip, Origin: origin, ...dev(d), ...(len !== undefined ? { "Content-Length": String(len) } : {}) },
      body,
    });
  const commit = (u, b = { w: 1000, h: 800 }, { d = "device-aaaaaaaa", ip = "2.2.2.2" } = {}) =>
    fetch(`${BASE}/photos/${u}/commit`, {
      method: "POST",
      headers: { "content-type": "application/json", "CF-Connecting-IP": ip, Origin: OK, ...dev(d) },
      body: JSON.stringify(b),
    });
  const del = (u, { pw, token, q = "" } = {}) =>
    fetch(`${BASE}/photos/${u}${q}`, {
      method: "DELETE",
      headers: { "content-type": "application/json", Origin: OK, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: pw === undefined ? undefined : JSON.stringify({ pw }),
    });
  const upload = async (b = {}, o = {}) => {
    const u = crypto.randomUUID();
    assert.equal((await put(u, "full", webp(5000), o)).status, 204);
    assert.equal((await put(u, "thumb", webp(900), o)).status, 204);
    return [u, await commit(u, { w: 1000, h: 800, ...b }, o)];
  };

  const r2keys = () => {
    const dir = join(persist, "v3/r2/miniflare-R2BucketObject");
    return readdirSync(dir).filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite").flatMap((f) => {
      const db = new DatabaseSync(join(dir, f), { readOnly: true });
      try { return db.prepare("SELECT key FROM _mf_objects").all().map((r) => r.key); } finally { db.close(); }
    });
  };

  const u1 = crypto.randomUUID();
  assert.equal((await put("not-a-uuid", "full", webp(100))).status, 400);
  assert.equal((await put(u1, "full", webp(100), { d: "x" })).status, 400);
  assert.equal((await put(u1, "full", Buffer.alloc(3 * 1024 * 1024 + 1, 1))).status, 413);
  assert.equal((await put(u1, "thumb", webp(200 * 1024 + 1))).status, 413);
  assert.equal((await put(u1, "full", Buffer.from("GIF89a-not-allowed-here"))).status, 415);
  assert.equal((await put(u1, "full", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).status, 415);
  assert.equal((await put(u1, "other", webp(100))).status, 405);
  assert.equal((await commit(u1)).status, 409);
  assert.equal((await put(u1, "full", jpg(5000))).status, 204);
  assert.equal((await commit(u1)).status, 409);
  assert.equal((await put(u1, "thumb", jpg(900))).status, 204);
  assert.equal((await commit(u1, { w: 0, h: 5 })).status, 400);
  assert.equal((await commit(u1, { w: 10, h: 5, pw: "abc" })).status, 400);
  let r = await commit(u1, { w: 4032, h: 3024, pw: "pw1234" });
  assert.equal(r.status, 201);
  const e1 = await r.json();
  assert.deepEqual(Object.keys(e1).sort(), ["created_at", "ext", "full", "h", "id", "thumb", "uuid", "w"]);
  assert.equal((await commit(u1)).status, 200);
  assert.equal((await put(u1, "full", jpg(5000))).status, 409);

  r = await fetch(e1.thumb);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "image/jpeg");
  assert.match(r.headers.get("cache-control"), /immutable/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.ok(r.headers.get("etag"));
  assert.equal((await r.arrayBuffer()).byteLength, 900);
  assert.equal((await fetch(`${BASE}/p/${crypto.randomUUID()}/full`)).status, 404);

  const [u2, r2] = await upload();
  assert.equal(r2.status, 201);
  const list = async () => (await (await call("/photos?limit=30")).json()).items.map((x) => x.uuid);
  assert.deepEqual((await list()).slice(0, 2), [u2, u1]);
  assert.ok(!JSON.stringify(await (await call("/photos")).json()).match(/pw_hash|salt|ip_hash|device/));
  assert.equal((await call("/photos?limit=1")).status, 200);
  assert.equal((await (await call("/photos?limit=1")).json()).nextCursor, (await r2.json()).id);

  assert.equal((await del(u1, { pw: "nope" })).status, 403);
  assert.equal((await del(u1)).status, 400);
  assert.equal((await del(u1, { pw: "pw1234", q: "?hide=1" })).status, 204);
  assert.equal((await fetch(e1.thumb)).status, 404);
  assert.equal(e1.ext, "jpg");
  assert.equal((await del(u1, { pw: "pw1234" })).status, 404);
  assert.equal((await del(u2, { pw: "whatever" })).status, 403);
  assert.equal((await del(u2, { token: "wrong" })).status, 400);

  const [u3] = await upload();
  const lst = await (await call("/photos?limit=30")).json();
  assert.ok(lst.items.every((x) => x.ext === "webp" || x.ext === "jpg"));
  assert.equal(lst.total, lst.items.length);
  assert.equal((await call(`/photos?limit=1&cursor=${lst.items[0].id}`)).status, 200);
  assert.equal((await (await call(`/photos?limit=1&cursor=${lst.items[0].id}`)).json()).total, undefined);
  assert.match((await call("/photos")).headers.get("cache-control"), /no-store/);
  assert.ok(r2keys().includes(`full/${u3}.webp`) && r2keys().includes(`thumb/${u3}.webp`));
  assert.equal((await del(u3, { token: "test-admin", q: "?hide=1" })).status, 204);
  assert.ok(!r2keys().some((k) => k.includes(u3)), "hide must delete R2 objects");
  assert.equal((await put(u3, "full", webp(100))).status, 409);
  assert.equal((await call("/photos?limit=30").then((r) => r.json())).total, lst.total - 1);
  assert.ok(!(await list()).includes(u3));
  assert.equal((await fetch(`${BASE}/p/${u3}/full`)).status, 404);
  assert.equal((await del(u3, { token: "test-admin" })).status, 204);
  assert.equal((await put(u3, "full", webp(100))).status, 204);
  const [u5] = await upload();
  assert.equal((await del(u5, { token: "test-admin" })).status, 204);
  assert.ok(!r2keys().some((k) => k.includes(u5)), "delete must remove R2 objects");

  const [u4] = await upload();
  assert.equal((await del(u4, { token: "test-admin" })).status, 204);
  assert.ok(!(await list()).includes(u4));

  const s2 = [];
  for (let i = 0; i < 41; i++) s2.push((await upload({}, { d: `device-ip-${i}xxxx`, ip: "3.3.3.3" }))[1].status);
  assert.deepEqual([...new Set(s2.slice(0, 40))], [201]);
  assert.equal(s2[40], 429);
  const s3 = [];
  for (let i = 0; i < 31; i++) s3.push((await upload({}, { d: "device-limit-1", ip: `4.4.${i}.1` }))[1].status);
  assert.deepEqual([...new Set(s3.slice(0, 30))], [201]);
  assert.equal(s3[30], 429);

  assert.equal((await put(crypto.randomUUID(), "full", webp(100), { origin: "https://evil.example" })).headers.get("access-control-allow-origin"), null);
  assert.equal((await call("/photos", { origin: "https://evil.example" })).headers.get("access-control-allow-origin"), null);
  const pre2 = await call("/photos/x/full", { method: "OPTIONS" });
  assert.match(pre2.headers.get("access-control-allow-methods"), /PUT/);
  assert.match(pre2.headers.get("access-control-allow-headers"), /X-Device/);
  /* ---------- 투표 ---------- */
  const pc = (path, { method = "GET", body, token, ip = "10.0.0.1", origin = OK } = {}) =>
    fetch(BASE + path, {
      method,
      headers: { "content-type": "application/json", "CF-Connecting-IP": ip, Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const tok = async () => (await (await pc("/auth/device", { method: "POST" })).json()).token;
  const addOpt = (text, token, ip) => pc("/poll/options", { method: "POST", body: { text }, token, ip });
  const castVote = (optionId, token) => pc("/poll/vote", { method: "POST", body: { optionId }, token });
  const state = async (token) => (await pc("/poll", { token })).json();

  let g = await state();
  assert.deepEqual([g.options, g.total, g.myVote, g.mode], [[], 0, null, "device"]);
  assert.equal((await addOpt("x")).status, 401);
  assert.equal((await castVote(1)).status, 401);

  const tA = await tok(), tB = await tok(), tC = await tok();
  for (const t of ["", "   ", "a".repeat(31), "a\u0007b", "a\tb", "a\nb", 123, null])
    assert.equal((await addOpt(t, tA)).status, 400, JSON.stringify(t));
  assert.equal((await pc("/poll/options", { method: "POST", body: {}, token: tA })).status, 400);
  r = await addOpt("  Vampire    Bat ", tA);
  assert.equal(r.status, 201);
  g = await r.json();
  const o1 = g.created;
  assert.deepEqual(g.options, [{ id: o1, text: "Vampire Bat", votes: 0, mine: true }]);
  assert.equal((await state(tB)).options[0].mine, false);
  assert.equal((await state()).options[0].mine, false);
  assert.equal((await addOpt("vampire bat", tB)).status, 409);
  assert.equal((await (await addOpt("VAMPIRE BAT", tB)).json()).error, "duplicate");
  assert.equal((await addOpt("Ghost", tA)).status, 201);
  r = await addOpt("Mummy", tA);
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, "limit");

  assert.equal((await castVote(999, tB)).status, 404);
  assert.equal((await castVote("1", tB)).status, 400);
  r = await castVote(o1, tB);
  assert.equal(r.status, 200);
  g = await r.json();
  assert.equal(g.total, 1);
  assert.equal(g.myVote, o1);
  r = await castVote(o1, tB);
  assert.equal(r.status, 409);
  g = await r.json();
  assert.deepEqual([g.error, g.total, g.myVote], ["already", 1, o1]);
  assert.equal((await state()).myVote, null);

  const rs = await Promise.all(Array.from({ length: 10 }, () => castVote(o1, tC)));
  assert.deepEqual(rs.map((x) => x.status).sort(), [200, ...Array(9).fill(409)]);
  assert.equal((await state()).total, 2);

  const sTamper = tA.slice(0, -2) + (tA.endsWith("AA") ? "BB" : "AA");
  const [pA, sA] = tA.split(".");
  const forged = Buffer.from(JSON.stringify({ vk: "device:evil", exp: Date.now() + 1e9 })).toString("base64url") + "." + sA;
  const mint = (obj, secret = SECRET) => { const p = Buffer.from(JSON.stringify(obj)).toString("base64url"); return `${p}.${createHmac("sha256", secret).update(p).digest("base64url")}`; };
  for (const t of [sTamper, forged, "garbage", `${pA}.${sA}.x`, mint({ vk: "device:z", exp: Date.now() - 1000 }), mint({ vk: "device:z", exp: Date.now() + 1e9 }, "other-secret"), mint({ vk: 5, exp: Date.now() + 1e9 })])
    assert.equal((await castVote(o1, t)).status, 401, t);
  assert.equal((await state(sTamper)).myVote, null);
  assert.equal((await castVote(o1, mint({ vk: "device:minted", exp: Date.now() + 1e9 }))).status, 200);

  const raw = JSON.stringify(await state(tB));
  assert.ok(!raw.match(/voter_key|creator_key|ip_hash|device:|vk/));
  assert.match((await pc("/poll")).headers.get("cache-control"), /no-store/);

  const rl = [];
  for (let i = 0; i < 6; i++) rl.push((await addOpt(`rate${i}`, await tok(), "10.9.9.9")).status);
  assert.deepEqual(rl, [201, 201, 201, 201, 201, 429]);

  assert.equal((await pc(`/poll/options/${o1}`, { method: "DELETE" })).status, 403);
  assert.equal((await pc(`/poll/options/${o1}`, { method: "DELETE", token: tA })).status, 403);
  assert.equal((await pc(`/poll/options/${o1}`, { method: "DELETE", token: "test-admin" })).status, 204);
  g = await state(tB);
  assert.ok(!g.options.some((o) => o.id === o1));
  assert.equal(g.total, 0);
  assert.equal((await castVote(o1, await tok())).status, 404);

  let k = 0;
  while ((await state()).options.length < 20) assert.equal((await addOpt(`fill${k}`, await tok(), `10.2.${k >> 2}.1`)).status, 201), k++;
  r = await addOpt("one too many", await tok(), "10.3.0.1");
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, "full");

  assert.equal((await pc("/poll", { origin: "https://evil.example" })).headers.get("access-control-allow-origin"), null);
  assert.equal((await pc("/poll", { origin: "https://evil.example" })).status, 200);
  assert.match((await pc("/poll", { method: "OPTIONS" })).headers.get("access-control-allow-headers"), /Authorization/);
  assert.equal((await pc("/poll", { method: "POST", body: {} })).status, 405);

  /* 카카오 교환(모의 서버) */
  const REDIR = "https://teddko.github.io/wedding/";
  const kk = (body) => pc("/auth/kakao", { method: "POST", body });
  r = await kk({ code: "ok-7777777001", redirectUri: REDIR });
  assert.equal(r.status, 200);
  const kt = (await r.json()).token;
  assert.deepEqual(kseen.at(-1), { grant_type: "authorization_code", client_id: "rk", redirect_uri: REDIR, code: "ok-7777777001", client_secret: "cs" });
  assert.ok(!Buffer.from(kt.split(".")[0], "base64url").toString().includes("7777777001"));
  const optK = (await state(kt)).options[0].id;
  assert.equal((await castVote(optK, kt)).status, 200);
  const kt2 = (await (await kk({ code: "ok-7777777001", redirectUri: REDIR })).json()).token;
  assert.equal((await castVote(optK, kt2)).status, 409);
  assert.equal((await state(kt2)).myVote, optK);
  const kt3 = (await (await kk({ code: "ok-7777777002", redirectUri: REDIR })).json()).token;
  assert.equal((await castVote(optK, kt3)).status, 200);
  r = await kk({ code: "bad-code", redirectUri: REDIR });
  assert.equal(r.status, 401);
  assert.ok(!(await r.json()).token);
  assert.equal((await kk({ code: "ok-1", redirectUri: "https://evil.example/" })).status, 400);
  assert.equal((await kk({ code: "ok-1", redirectUri: "http://localhost:4321/wedding/" })).status, 200);
  assert.equal((await kk({ redirectUri: REDIR })).status, 400);
  assert.equal((await pc("/auth/kakao", { method: "GET" })).status, 405);

  console.log("ALL PASS");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  dev.kill();
  kmock.close();
}
