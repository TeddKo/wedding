// 로컬 wrangler dev 를 띄워 fetch 로 검증. 사용: pnpm test
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const OK = "https://teddko.github.io";
const persist = mkdtempSync(join(tmpdir(), "gb-"));
const varsFile = join(persist, ".dev.vars");
writeFileSync(varsFile, "IP_PEPPER=test-pepper\nADMIN_TOKEN=test-admin\n");
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
  assert.deepEqual(Object.keys(e1).sort(), ["created_at", "full", "h", "id", "thumb", "uuid", "w"]);
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
  assert.equal((await del(u1, { pw: "pw1234" })).status, 404);
  assert.equal((await del(u2, { pw: "whatever" })).status, 403);
  assert.equal((await del(u2, { token: "wrong" })).status, 400);

  const [u3] = await upload();
  assert.equal((await del(u3, { token: "test-admin", q: "?hide=1" })).status, 204);
  assert.ok(!(await list()).includes(u3));
  assert.equal((await fetch(`${BASE}/p/${u3}/full`)).status, 404);
  assert.equal((await del(u3, { token: "test-admin" })).status, 204);
  assert.equal((await put(u3, "full", webp(100))).status, 204);

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
  console.log("ALL PASS");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  dev.kill();
}
