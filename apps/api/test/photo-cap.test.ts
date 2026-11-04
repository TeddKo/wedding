import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { BASE, OK } from "./helpers";
import { webp } from "./images";

const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const img = webp(300);
const put = (cap: number, u: string, ip: string) =>
  worker.fetch(
    new Request(`${BASE}/photos/${u}/full`, {
      method: "PUT",
      headers: { "CF-Connecting-IP": ip, Origin: OK, "Content-Length": String(img.length), "X-Device": `device-${ip.replaceAll(".", "")}xxxx` },
      body: webp(300),
    }),
    { ...env, PHOTO_TOTAL_N: String(cap) } as typeof env,
    ctx,
  );

describe("사진 총량 제한", () => {
  it("보이는 사진 + 미커밋 업로드가 PHOTO_TOTAL_N 이상이면 새 uuid 는 403 full, 기존 uuid 는 계속 허용", async () => {
    const first = crypto.randomUUID();
    expect((await put(3, first, "7.0.0.1")).status).toBe(204);
    expect((await put(3, crypto.randomUUID(), "7.0.0.2")).status).toBe(204);
    expect((await put(3, crypto.randomUUID(), "7.0.0.3")).status).toBe(204);
    const r = await put(3, crypto.randomUUID(), "7.0.0.4");
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toBe("full");
    expect((await put(3, first, "7.0.0.1")).status, "same uuid thumb/full retry unaffected").toBe(204);
  });
});
