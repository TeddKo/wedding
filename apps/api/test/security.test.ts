import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BASE, call, callWith, OK, REDIR, sleepMs } from "./helpers";
import { concat, raw, webp } from "./images";

const good = { name: "보안", message: "테스트", password: "pw1234" };
const rawReq = (path: string, init: RequestInit & { ip?: string } = {}) =>
  exports.default.fetch(new Request(BASE + path, { ...init, headers: { Origin: OK, "CF-Connecting-IP": init.ip ?? "20.0.0.1", ...init.headers } }));

const stream = (...chunks: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const x of chunks) c.enqueue(x);
      c.close();
    },
  });

afterEach(() => vi.restoreAllMocks());

describe("보안 헤더와 경로", () => {
  it("JSON 응답에 보안 헤더", async () => {
    const r = await call("/entries");
    expect(r.headers.get("strict-transport-security")).toMatch(/max-age=\d+/);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    expect(r.headers.get("content-security-policy")).toMatch(/default-src 'none'/);
    expect(r.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
    expect(r.headers.get("permissions-policy")).toMatch(/camera=\(\)/);
    expect(r.headers.get("vary")).toMatch(/Origin/);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("OPTIONS 에도 보안 헤더와 no-store", async () => {
    const r = await call("/anything", { method: "OPTIONS" });
    expect(r.status).toBe(204);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("인코딩된 개행 경로는 404 이며 CORS·보안 헤더 유지", async () => {
    for (const p of ["/entries%0A", "/entries%00", "/photos%0A", "/poll%0d%0a"]) {
      const r = await call(p);
      expect(r.status, p).toBe(404);
      expect(((await r.json()) as { error: string }).error).toBe("not found");
      expect(r.headers.get("access-control-allow-origin"), p).toBe(OK);
      expect(r.headers.get("strict-transport-security"), p).toBeTruthy();
      expect(r.headers.get("x-content-type-options"), p).toBe("nosniff");
    }
  });
});

describe("요청 본문 방어", () => {
  it("Content-Type 이 application/json 이 아니면 400", async () => {
    for (const ct of ["text/plain", "application/x-www-form-urlencoded", "text/json", ""]) {
      const r = await rawReq("/entries", { method: "POST", headers: ct ? { "Content-Type": ct } : {}, body: JSON.stringify(good) });
      expect(r.status, ct).toBe(400);
      expect(((await r.json()) as { error: string }).error).toBe("invalid body");
    }
    const ok = await rawReq("/entries", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(good) });
    expect(ok.status).toBe(201);
    const k = await rawReq("/auth/kakao", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ code: "ok-1", redirectUri: REDIR }),
    });
    expect(k.status).toBe(400);
  });

  it("스트림 본문이 4KB 를 넘으면 400", async () => {
    const big = new TextEncoder().encode(JSON.stringify({ ...good, message: "x".repeat(5000) }));
    const r = await rawReq("/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: stream(big.subarray(0, 3000), big.subarray(3000)),
      duplex: "half",
    } as RequestInit);
    expect(r.status).toBe(400);
  });

  it("프로토타입 오염 키는 무시", async () => {
    const body = `{"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted2":"yes"}},"name":"${good.name}","message":"${good.message}","password":"pw1234","isAdmin":true}`;
    const r = await rawReq("/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body, ip: "20.0.0.2" });
    expect(r.status).toBe(201);
    expect(Object.keys((await r.json()) as object).sort()).toEqual(["created_at", "id", "message", "name"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted2).toBeUndefined();
    const v = await rawReq("/poll/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"__proto__":{"optionId":1}}' });
    expect(v.status).toBe(401);
  });

  it("PUT 은 Content-Length 가 없으면 413", async () => {
    const r = await rawReq(`/photos/${crypto.randomUUID()}/full`, {
      method: "PUT",
      headers: { "X-Device": "device-aaaaaaaa" },
      body: stream(webp(500)),
      duplex: "half",
    } as RequestInit);
    expect(r.status).toBe(413);
  });

  it("JPEG 세그먼트 순회 상한 초과는 422", async () => {
    const app0 = concat(...Array.from({ length: 600 }, () => raw(0xff, 0xe0, 0, 4, 0, 0)));
    const sof = raw(0xff, 0xc0, 0, 17, 8, 3, 0x20, 3, 0x20, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1);
    const body = concat(raw(0xff, 0xd8), app0, sof);
    const r = await rawReq(`/photos/${crypto.randomUUID()}/full`, { method: "PUT", headers: { "X-Device": "device-aaaaaaaa" }, body });
    expect(r.status).toBe(422);
  });
});

describe("비밀번호 무차별 대입", () => {
  it("방명록 삭제 11번째 오답은 429", async () => {
    const made = await rawReq("/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(good), ip: "20.1.0.1" });
    const { id } = (await made.json()) as { id: number };
    const del = (pw: string, ip: string) => call(`/entries/${id}`, { method: "DELETE", body: { password: pw }, ip });
    const s: number[] = [];
    for (let i = 0; i < 11; i++) s.push((await del(`guess${i}`, "20.1.0.9")).status);
    expect(s).toEqual([...Array(10).fill(403), 429]);
    expect((await del("pw1234", "20.1.0.9")).status, "locked even with right pw").toBe(429);
    expect((await del("pw1234", "20.1.0.8")).status, "other IP unaffected").toBe(204);
  });
});

describe("/p 캐시", () => {
  it("캐시 적중 응답에도 헤더 병합 오류 없이 보안·CORS 헤더 부여", async () => {
    const u = crypto.randomUUID();
    const dev = { "X-Device": "device-cachecache" };
    const put = (k: string, b: Uint8Array) => rawReq(`/photos/${u}/${k}`, { method: "PUT", headers: dev, body: b });
    expect((await put("full", webp(800))).status).toBe(204);
    expect((await put("thumb", webp(600, 400, 300))).status).toBe(204);
    const c = await rawReq(`/photos/${u}/commit`, { method: "POST", headers: { ...dev, "Content-Type": "application/json" }, body: "{}" });
    expect(c.status).toBe(201);
    const first = await rawReq(`/p/${u}/thumb`);
    expect(first.status).toBe(200);
    expect((await first.arrayBuffer()).byteLength).toBe(600);
    await sleepMs(200);
    await env.DB.prepare("UPDATE photos SET hidden = 1 WHERE uuid = ?").bind(u).run();
    const hit = await rawReq(`/p/${u}/thumb`);
    expect(hit.status, "served from cache though row is hidden").toBe(200);
    expect(hit.headers.get("content-type")).toBe("image/webp");
    expect(hit.headers.get("cache-control")).toMatch(/immutable/);
    expect(hit.headers.get("x-content-type-options")).toBe("nosniff");
    expect(hit.headers.get("content-security-policy")).toMatch(/default-src 'none'/);
    expect(hit.headers.get("content-disposition")).toBe(`inline; filename="${u}.webp"`);
    expect(hit.headers.get("access-control-allow-origin")).toBe(OK);
  });
});

describe("외부 호출과 오류 응답", () => {
  it("카카오 호출에 5초 타임아웃 신호, 타임아웃은 502", async () => {
    let signal: AbortSignal | null | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_i: unknown, init?: RequestInit) => {
      signal = init?.signal;
      throw new DOMException("timeout", "TimeoutError");
    }) as typeof fetch);
    const r = await call("/auth/kakao", { method: "POST", body: { code: "ok-1", redirectUri: REDIR }, ip: "20.2.0.1" });
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toBe("kakao unavailable");
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("500 응답과 로그에 비밀·상세 미포함", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await callWith({ SESSION_SECRET: undefined }, "/auth/device", { method: "POST" });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "server error" });
    expect(log).toHaveBeenCalledOnce();
    const entry = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(Object.keys(entry).sort()).toEqual(["err", "ray", "route"]);
    expect(entry.route).toBe("/auth/device");
    expect(JSON.stringify(entry)).not.toMatch(/secret|test-/i);
  });
});
