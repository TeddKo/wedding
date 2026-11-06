import { createScheduledController } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { PHOTO_DEVICE_MAX, PHOTO_IP_N } from "../src/limits";
import { BASE, call, OK, r2keys, sleepMs } from "./helpers";
import { ascii, concat, jpg, raw, riff, webp, webpL, webpX } from "./images";

type View = { id: number; uuid: string; w: number; h: number; created_at: number; ext: string; locked: boolean; thumb: string; full: string };
type List = { items: View[]; nextCursor: number | null; total?: number };

const dev = (d: string) => ({ "X-Device": d });
const path = (url: string) => new URL(url).pathname;

const put = (
  u: string,
  kind: string,
  body: Uint8Array,
  { d = "device-aaaaaaaa", ip = "2.2.2.2", origin = OK }: { d?: string; ip?: string; origin?: string } = {},
) => exports.default.fetch(new Request(`${BASE}/photos/${u}/${kind}`, { method: "PUT", headers: { "CF-Connecting-IP": ip, Origin: origin, ...dev(d) }, body }));

const commit = (u: string, b: unknown = { w: 1000, h: 800 }, { d = "device-aaaaaaaa", ip = "2.2.2.2" }: { d?: string; ip?: string } = {}) =>
  exports.default.fetch(
    new Request(`${BASE}/photos/${u}/commit`, {
      method: "POST",
      headers: { "content-type": "application/json", "CF-Connecting-IP": ip, Origin: OK, ...dev(d) },
      body: JSON.stringify(b),
    }),
  );

const del = (u: string, { pw, token, q = "", ip = "5.5.5.5", d }: { pw?: string; token?: string; q?: string; ip?: string; d?: string } = {}) =>
  exports.default.fetch(
    new Request(`${BASE}/photos/${u}${q}`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        Origin: OK,
        "CF-Connecting-IP": ip,
        ...(d ? dev(d) : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: pw === undefined ? undefined : JSON.stringify({ pw }),
    }),
  );

const upload = async (b: Record<string, unknown> = {}, o: { d?: string; ip?: string } = {}): Promise<[string, Response]> => {
  const u = crypto.randomUUID();
  expect((await put(u, "full", webp(5000), o)).status).toBe(204);
  expect((await put(u, "thumb", webp(900, 400, 320), o)).status).toBe(204);
  return [u, await commit(u, { w: 1000, h: 800, ...b }, o)];
};

const list = async () => ((await (await call("/photos?limit=30")).json()) as List).items.map((x) => x.uuid);
const json = async <T>(r: Response) => (await r.json()) as T;

describe("photos", () => {
  const u1 = crypto.randomUUID();
  let e1!: View;
  let u2!: string;
  let r2!: Response;

  it("PUT 검증과 커밋", async () => {
    expect((await put("not-a-uuid", "full", webp(100))).status).toBe(400);
    expect((await put(u1, "full", webp(100), { d: "x" })).status).toBe(400);
    expect((await put(u1, "full", new Uint8Array(3 * 1024 * 1024 + 1).fill(1))).status).toBe(413);
    expect((await put(u1, "thumb", webp(200 * 1024 + 1))).status).toBe(413);
    expect((await put(u1, "full", ascii("GIF89a-not-allowed-here"))).status).toBe(415);
    expect((await put(u1, "full", raw(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0))).status).toBe(415);
    expect((await put(u1, "other", webp(100))).status).toBe(405);
    expect((await commit(u1)).status).toBe(409);
    expect((await put(u1, "full", jpg(5000))).status).toBe(204);
    expect((await commit(u1)).status).toBe(409);
    expect((await put(u1, "thumb", jpg(900, 400, 320))).status).toBe(204);
    expect((await commit(u1, { w: 10, h: 5, pw: "abc" })).status).toBe(400);
    const r = await commit(u1, { w: 4032, h: 3024, pw: "pw1234" });
    expect(r.status).toBe(201);
    e1 = await json<View>(r);
    expect([e1.w, e1.h], "w/h come from server-parsed header, not the request body").toEqual([1000, 800]);
    expect(Object.keys(e1).sort()).toEqual(["created_at", "ext", "full", "h", "id", "locked", "thumb", "uuid", "w"]);
    expect(e1.locked).toBe(true);
    const again = await commit(u1);
    expect(again.status).toBe(200);
    expect((await json<View>(again)).locked).toBe(true);
    expect((await put(u1, "full", jpg(5000))).status).toBe(409);
  });

  it("GET /p 이미지 응답", async () => {
    const r = await call(path(e1.thumb), { origin: null });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/jpeg");
    expect(r.headers.get("cache-control")).toMatch(/immutable/);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("etag")).toBeTruthy();
    expect((await r.arrayBuffer()).byteLength).toBe(900);
    expect((await call(`/p/${crypto.randomUUID()}/full`, { origin: null })).status).toBe(404);
  });

  it("목록, locked 플래그, 내부 필드 비노출", async () => {
    [u2, r2] = await upload();
    expect(r2.status).toBe(201);
    expect((await list()).slice(0, 2)).toEqual([u2, u1]);
    expect(
      (await json<List>(await call("/photos?limit=2"))).items.map((x) => x.locked),
      "GET /photos locked flag",
    ).toEqual([false, true]);
    expect((await json<View>(r2.clone())).locked).toBe(false);
    expect(JSON.stringify(await (await call("/photos")).json())).not.toMatch(/pw_hash|salt|ip_hash|device/);
    expect((await call("/photos?limit=1")).status).toBe(200);
    expect((await json<List>(await call("/photos?limit=1"))).nextCursor).toBe((await json<View>(r2)).id);
  });

  it("삭제: 비밀번호, hide, 관리자", async () => {
    expect((await del(u1, { pw: "nope" })).status).toBe(403);
    expect((await del(u1)).status).toBe(400);
    expect((await del(u1, { pw: "pw1234", q: "?hide=1" })).status).toBe(204);
    expect((await call(path(e1.thumb), { origin: null })).status).toBe(404);
    expect(e1.ext).toBe("jpg");
    expect((await del(u1, { pw: "pw1234" })).status).toBe(404);
    expect((await del(u2, { pw: "whatever" })).status).toBe(403);
    expect((await del(u2, { token: "wrong" })).status).toBe(403);

    const [u3] = await upload();
    const lst = await json<List>(await call("/photos?limit=30"));
    expect(lst.items.every((x) => x.ext === "webp" || x.ext === "jpg")).toBe(true);
    expect(lst.total).toBe(lst.items.length);
    expect((await call(`/photos?limit=1&cursor=${lst.items[0]!.id}`)).status).toBe(200);
    expect((await json<List>(await call(`/photos?limit=1&cursor=${lst.items[0]!.id}`))).total).toBeUndefined();
    expect((await call("/photos")).headers.get("cache-control")).toMatch(/no-store/);
    let keys = await r2keys();
    expect(keys.includes(`full/${u3}.webp`) && keys.includes(`thumb/${u3}.webp`)).toBe(true);
    expect((await del(u3, { token: "test-admin", q: "?hide=1" })).status).toBe(204);
    expect(
      (await r2keys()).some((k) => k.includes(u3)),
      "hide must delete R2 objects",
    ).toBe(false);
    expect((await put(u3, "full", webp(100))).status).toBe(409);
    expect((await json<List>(await call("/photos?limit=30"))).total).toBe(lst.total! - 1);
    expect(await list()).not.toContain(u3);
    expect((await call(`/p/${u3}/full`, { origin: null })).status).toBe(404);
    expect((await del(u3, { token: "test-admin" })).status).toBe(204);
    expect((await put(u3, "full", webp(100))).status).toBe(204);
    const [u5] = await upload();
    expect((await del(u5, { token: "test-admin" })).status).toBe(204);
    keys = await r2keys();
    expect(
      keys.some((k) => k.includes(u5)),
      "delete must remove R2 objects",
    ).toBe(false);

    const [u4] = await upload();
    expect((await del(u4, { token: "test-admin" })).status).toBe(204);
    expect(await list()).not.toContain(u4);
  });

  it("기기 소유 증명 삭제", async () => {
    const [d1, rd1] = await upload({ pw: "pw1234" });
    expect(rd1.status).toBe(201);
    expect((await del(d1, { d: "device-bbbbbbbb" })).status, "other device without pw").toBe(400);
    expect((await del(d1, { d: "device-bbbbbbbb", pw: "bad-pw" })).status).toBe(403);
    expect(await list()).toContain(d1);
    expect((await del(d1, { d: "device-aaaaaaaa" })).status, "owner device of a password photo still needs the pw").toBe(400);
    expect((await del(d1, { d: "device-aaaaaaaa", pw: "bad-pw" })).status, "owner + wrong pw").toBe(403);
    expect(await list()).toContain(d1);
    expect((await del(d1, { d: "device-aaaaaaaa", pw: "pw1234" })).status, "owner + right pw").toBe(204);
    expect(await list()).not.toContain(d1);
    expect((await r2keys()).some((k) => k.includes(d1))).toBe(false);
    const [d2] = await upload({ pw: "pw1234" });
    expect((await del(d2, { d: "device-bbbbbbbb", pw: "pw1234" })).status, "password path from other device").toBe(204);
    const [d3, rd3] = await upload();
    expect((await json<View>(rd3)).locked).toBe(false);
    const nopw = await del(d3, { d: "device-bbbbbbbb", pw: "whatever" });
    expect(nopw.status).toBe(403);
    expect(((await nopw.json()) as { error: string }).error).toBe("no password");
    expect((await del(d3)).status).toBe(403);
    expect(await list()).toContain(d3);
    expect((await del(d3, { d: "device-aaaaaaaa" })).status, "owner can delete photo without pw").toBe(204);
    const [d4] = await upload();
    expect((await del(d4, { token: "test-admin", d: "device-bbbbbbbb" })).status, "admin still works").toBe(204);
    const [d5] = await upload({ pw: "pw1234" });
    expect((await del(d5, { token: "test-admin" })).status, "admin deletes a password photo without pw").toBe(204);
  });

  it("PUT 시점 한도: IP 10분 PHOTO_IP_N건, 기기 10분 PHOTO_DEVICE_MAX건", async () => {
    const s2: number[] = [];
    for (let i = 0; i <= PHOTO_IP_N; i++) s2.push((await put(crypto.randomUUID(), "full", webp(300), { d: `device-ip-${i}xxxx`, ip: "3.3.3.3" })).status);
    expect([...new Set(s2.slice(0, PHOTO_IP_N))]).toEqual([204]);
    expect(s2[PHOTO_IP_N]).toBe(429);
    const s3: number[] = [];
    for (let i = 0; i <= PHOTO_DEVICE_MAX; i++) s3.push((await put(crypto.randomUUID(), "full", webp(300), { d: "device-limit-1", ip: `4.4.${i}.1` })).status);
    expect([...new Set(s3.slice(0, PHOTO_DEVICE_MAX))]).toEqual([204]);
    expect(s3[PHOTO_DEVICE_MAX]).toBe(429);
    const uSame = crypto.randomUUID();
    expect((await put(uSame, "full", webp(300), { d: "device-limit-2", ip: "4.5.0.1" })).status).toBe(204);
    for (let i = 0; i < PHOTO_DEVICE_MAX - 1; i++) expect((await put(crypto.randomUUID(), "full", webp(300), { d: "device-limit-2", ip: "4.5.0.1" })).status).toBe(204);
    expect((await put(uSame, "thumb", webp(300, 400, 300), { d: "device-limit-2", ip: "4.5.0.1" })).status, "known uuid is not re-counted").toBe(204);
  });

  it("기기별 10분 남은 업로드 수: 업로드·삭제 반영, 기기 헤더 필수", async () => {
    const quota = async (d?: string) => exports.default.fetch(new Request(`${BASE}/photos/quota`, { headers: { Origin: OK, ...(d ? dev(d) : {}) } }));
    expect((await quota()).status).toBe(400);
    const d = "device-quota-1";
    expect(await json<{ left: number }>(await quota(d))).toEqual({ left: PHOTO_DEVICE_MAX });
    const [u, r] = await upload({}, { d, ip: "6.6.6.6" });
    expect(r.status).toBe(201);
    expect(await json<{ left: number }>(await quota(d))).toEqual({ left: PHOTO_DEVICE_MAX - 1 });
    expect((await del(u, { d })).status).toBe(204);
    expect(await json<{ left: number }>(await quota(d))).toEqual({ left: PHOTO_DEVICE_MAX });
  });

  it("확장자 불일치", async () => {
    const uExt = crypto.randomUUID();
    expect((await put(uExt, "full", webp(500))).status).toBe(204);
    expect((await put(uExt, "thumb", jpg(500, 400, 300))).status).toBe(409);
    expect((await put(uExt, "thumb", webp(500, 400, 300))).status).toBe(204);
  });

  it("픽셀 치수 검증", async () => {
    const uDim = crypto.randomUUID();
    const dimCases: [string, Uint8Array, number][] = [
      ["full", jpg(600, 2562, 100), 204],
      ["full", jpg(600, 2563, 100), 422],
      ["full", jpg(600, 100, 3000), 422],
      ["full", webp(600, 4000, 3000), 422],
      ["full", webpL(600, 3000, 100), 422],
      ["full", webpX(600, 100, 5000), 422],
      ["full", webpL(600, 2560, 1920), 204],
      ["full", webpX(600, 2560, 1707), 204],
      ["thumb", webp(600, 483, 100), 422],
      ["thumb", webp(600, 482, 100), 204],
      ["thumb", webpL(600, 480, 480), 204],
      ["thumb", webpX(600, 100, 481), 204],
      ["thumb", webpX(600, 100, 600), 422],
    ];
    for (const [kind, body, want] of dimCases) {
      const x = body[0] === 0xff ? "jpg" : "webp";
      const uu = x === "jpg" ? crypto.randomUUID() : uDim;
      expect((await put(uu, kind, body)).status, `${kind} ${x} ${body.length} want ${want}`).toBe(want);
    }
    expect((await put(crypto.randomUUID(), "full", concat(raw(0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0), new Uint8Array(300).fill(7)))).status, "no SOF").toBe(422);
    expect((await put(crypto.randomUUID(), "full", riff(ascii("VP8 "), 100))).status, "bad vp8").toBe(422);
    const uStore = crypto.randomUUID();
    expect((await put(uStore, "full", jpg(4000, 2000, 1500))).status).toBe(204);
    expect((await put(uStore, "thumb", jpg(800, 400, 300))).status).toBe(204);
    const cs = await commit(uStore, { w: 1, h: 1 });
    expect(cs.status).toBe(201);
    const csj = await json<View>(cs);
    expect([csj.w, csj.h]).toEqual([2000, 1500]);
    expect((await json<List>(await call("/photos?limit=1"))).items.map((x) => [x.w, x.h])).toEqual([[2000, 1500]]);
  });

  it("커밋 레이스", async () => {
    const uRace = crypto.randomUUID();
    expect((await put(uRace, "full", webp(900))).status).toBe(204);
    expect((await put(uRace, "thumb", webp(900, 400, 320))).status).toBe(204);
    const rr = await Promise.all(Array.from({ length: 8 }, () => commit(uRace)));
    const rrs = rr.map((x) => x.status).sort();
    expect(rrs.every((x) => x === 200 || x === 201) && rrs.includes(201), rrs.join()).toBe(true);
    const bodies = await Promise.all(rr.map((x) => json<View>(x)));
    expect(bodies.map((x) => x.id).filter((v, i, a) => a.indexOf(v) === i).length).toBe(1);
    expect(rr[0]!.headers.get("access-control-allow-origin")).toBe(OK);
    expect((await commit(crypto.randomUUID())).headers.get("access-control-allow-origin")).toBe(OK);
  });

  it("고아 정리(cron)", async () => {
    const orphan = crypto.randomUUID();
    const keep = crypto.randomUUID();
    expect((await put(orphan, "full", webp(500))).status).toBe(204);
    expect((await put(orphan, "thumb", webp(500, 400, 300))).status).toBe(204);
    expect((await put(keep, "full", webp(500))).status).toBe(204);
    expect((await put(keep, "thumb", webp(500, 400, 300))).status).toBe(204);
    expect((await commit(keep)).status).toBe(201);
    await sleepMs(2300);
    const fresh = crypto.randomUUID();
    expect((await put(fresh, "full", webp(500))).status).toBe(204);
    expect(await r2keys()).toContain(`full/${orphan}.webp`);
    await worker.scheduled(createScheduledController({ scheduledTime: new Date(), cron: "17 * * * *" }), env);
    const keys = await r2keys();
    expect(
      keys.some((k) => k.includes(orphan)),
      "orphan R2 objects removed",
    ).toBe(false);
    expect(keys.includes(`full/${keep}.webp`) && keys.includes(`thumb/${keep}.webp`), "committed kept").toBe(true);
    expect(keys, "fresh upload kept").toContain(`full/${fresh}.webp`);
    expect((await put(orphan, "full", jpg(500))).status, "orphan row gone so ext is free again").toBe(204);
  });

  it("삭제 비밀번호 무차별 대입 제한", async () => {
    const [uBf, rBf] = await upload({ pw: "right-pw" }, { ip: "2.2.2.9" });
    expect(rBf.status).toBe(201);
    const bf: number[] = [];
    for (let i = 0; i < 11; i++) bf.push((await del(uBf, { pw: `guess${i}`, ip: "6.6.6.6" })).status);
    expect(bf).toEqual([...Array(10).fill(403), 429]);
    expect((await del(uBf, { pw: "right-pw", ip: "6.6.6.6" })).status, "locked even with right pw").toBe(429);
    expect((await del(uBf, { pw: "right-pw", ip: "6.6.6.6", d: "device-aaaaaaaa" })).status, "owner device is rate-limited too").toBe(429);
    expect((await del(uBf, { pw: "right-pw", ip: "6.6.7.7" })).status, "other IP unaffected").toBe(204);
  });

  it("사진 CORS", async () => {
    expect((await put(crypto.randomUUID(), "full", webp(100), { origin: "https://evil.example" })).headers.get("access-control-allow-origin")).toBeNull();
    expect((await call("/photos", { origin: "https://evil.example" })).headers.get("access-control-allow-origin")).toBeNull();
    const pre2 = await call("/photos/x/full", { method: "OPTIONS" });
    expect(pre2.headers.get("access-control-allow-methods")).toMatch(/PUT/);
    expect(pre2.headers.get("access-control-allow-headers")).toMatch(/X-Device/);
  });
});
