import { describe, expect, it } from "vitest";
import { call, OK } from "./helpers";

const post = (b: unknown, ip?: string) => call("/entries", { method: "POST", body: b, ip });
const good = { name: " 홍길동 ", message: " 축하해요 ", password: "pw1234" };

describe("entries", () => {
  const ids: number[] = [];

  it("등록과 응답 형태", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await post({ ...good, message: `m${i}` }, "9.9.9.9");
      expect(r.status).toBe(201);
      expect(r.headers.get("content-type")).toMatch(/application\/json; charset=utf-8/);
      expect(r.headers.get("cache-control")).toBe("no-store");
      const j = (await r.json()) as { id: number; name: string };
      expect(j.name).toBe("홍길동");
      expect(Object.keys(j).sort()).toEqual(["created_at", "id", "message", "name"]);
      ids.push(j.id);
    }
  });

  it("커서 페이징, 내부 필드 비노출", async () => {
    let j = (await (await call("/entries?limit=2")).json()) as { items: { id: number }[]; nextCursor: number | null };
    expect(j.items.map((x) => x.id)).toEqual([ids[2], ids[1]]);
    expect(j.nextCursor).toBe(ids[1]);
    expect(JSON.stringify(j)).not.toMatch(/pw_hash|salt|ip_hash/);
    j = (await (await call(`/entries?limit=2&cursor=${j.nextCursor}`)).json()) as typeof j;
    expect(j.items.map((x) => x.id)).toEqual([ids[0]]);
    expect(j.nextCursor).toBeNull();
  });

  it("입력 검증 400", async () => {
    for (const b of [
      { ...good, name: "" },
      { ...good, name: "a".repeat(21) },
      { ...good, message: "a".repeat(301) },
      { ...good, message: "  " },
      { ...good, password: "abc" },
      { ...good, name: "a\u0000b" },
      { ...good, message: "a\u0007b" },
      { ...good, name: "a\nb" },
      { name: "a" },
    ])
      expect((await post(b, "8.8.8.8")).status, JSON.stringify(b)).toBe(400);
    const ml = (await (await post({ ...good, message: "첫 줄\r\n\r\n\r\n\r\n둘째 줄" }, "6.6.6.6")).json()) as { message: string };
    expect(ml.message).toBe("첫 줄\n\n둘째 줄");
    expect((await post({ ...good, message: "x".repeat(5000) }, "8.8.8.8")).status).toBe(400);
  });

  it("삭제와 404", async () => {
    const del = (pw: string) => call(`/entries/${ids[0]}`, { method: "DELETE", body: { password: pw } });
    expect((await del("nope")).status).toBe(403);
    expect((await del("pw1234")).status).toBe(204);
    expect((await del("pw1234")).status).toBe(404);
    expect((await call("/nope")).status).toBe(404);
  });

  it("IP 당 10분 5건 제한", async () => {
    const s: number[] = [];
    for (let i = 0; i < 6; i++) s.push((await post(good, "7.7.7.7")).status);
    expect(s).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it("CORS", async () => {
    expect((await call("/entries")).headers.get("access-control-allow-origin")).toBe(OK);
    expect((await call("/entries", { origin: "https://evil.example" })).headers.get("access-control-allow-origin")).toBeNull();
    expect((await call("/entries", { origin: "https://teddko.github.io.evil.example" })).headers.get("access-control-allow-origin")).toBeNull();
    const pre = await call("/entries", { method: "OPTIONS" });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(OK);
    expect((await call("/entries", { method: "OPTIONS", origin: "https://evil.example" })).headers.get("access-control-allow-origin")).toBeNull();
    expect((await call("/entries", { origin: "http://localhost:4321" })).headers.get("access-control-allow-origin")).toBe("http://localhost:4321");
  });

  it("IPv6 는 /64 단위로 제한", async () => {
    const v6: number[] = [];
    for (const ip of [
      "2001:db8:1:2::1",
      "2001:db8:1:2:aaaa:bbbb:cccc:dddd",
      "2001:0db8:0001:0002::9",
      "2001:db8:1:2::2",
      "2001:DB8:1:2:0:0:0:3",
      "2001:db8:1:2::4",
    ])
      v6.push((await post(good, ip)).status);
    expect(v6).toEqual([201, 201, 201, 201, 201, 429]);
    expect((await post(good, "2001:db8:1:3::1")).status).toBe(201);
  });
});
