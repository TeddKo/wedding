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
writeFileSync(varsFile, "IP_PEPPER=test-pepper\n");
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
  console.log("ALL PASS");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  dev.kill();
}
