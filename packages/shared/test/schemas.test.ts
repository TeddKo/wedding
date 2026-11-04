import { describe, expect, it } from "vitest";
import { entryCreate, pollOptionCreate } from "../src/schemas";

describe("schemas", () => {
  it("entryCreate: 공백 제거, 개행 정규화", () => {
    const r = entryCreate.safeParse({ name: " 홍길동 ", message: "첫 줄\r\n\r\n\r\n\r\n둘째 줄", password: "pw1234" });
    expect(r.data).toEqual({ name: "홍길동", message: "첫 줄\n\n둘째 줄", password: "pw1234" });
  });

  it("entryCreate: 길이와 제어 문자 거부", () => {
    const ok = { name: "a", message: "m", password: "pw12" };
    for (const bad of [{ name: "" }, { name: "a".repeat(21) }, { message: "a".repeat(301) }, { password: "abc" }, { name: "a\nb" }, { message: "a\u0007b" }])
      expect(entryCreate.safeParse({ ...ok, ...bad }).success, JSON.stringify(bad)).toBe(false);
  });

  it("pollOptionCreate: NFKC 정규화와 서식 문자 거부", () => {
    expect(pollOptionCreate.safeParse({ text: "  ＮＦＫＣ　Ｔｅｓｔ " }).data).toEqual({ text: "NFKC Test" });
    for (const t of ["", "a​b", "a\tb", "a".repeat(31)]) expect(pollOptionCreate.safeParse({ text: t }).success, JSON.stringify(t)).toBe(false);
  });
});
