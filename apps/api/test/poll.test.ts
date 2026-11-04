import { env } from "cloudflare:workers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POLL } from "@wedding/shared";
import { KAKAO_IP_N } from "../src/limits";
import { call, callWith, mint, payloadOf, REDIR, SECRET } from "./helpers";

type Opt = { id: number; text: string; votes: number; mine: boolean };
type State = { mode: string; options: Opt[]; total: number; myVote: number | null; created?: number; error?: string };

const pc = (path: string, o: { method?: string; body?: unknown; token?: string; ip?: string; origin?: string } = {}) => call(path, { ip: "10.0.0.1", ...o });
const tok = async () => ((await (await pc("/auth/device", { method: "POST" })).json()) as { token: string }).token;
const addOpt = (text: unknown, token?: string, ip?: string) => pc("/poll/options", { method: "POST", body: { text }, token, ip });
const castVote = (optionId: unknown, token?: string) => pc("/poll/vote", { method: "POST", body: { optionId }, token });
const state = async (token?: string) => (await (await pc("/poll", { token })).json()) as State;
const json = async <T>(r: Response) => (await r.json()) as T;

const kseen: Record<string, string>[] = [];

/** 카카오 서버 모의: 코드가 ok- 로 시작하면 성공, access_token 은 at-<번호> */
const kakaoFetch = (realFetch: typeof fetch): typeof fetch =>
  (async (input, init) => {
    const req = new Request(input as RequestInfo, init);
    const url = new URL(req.url);
    if (url.origin === "https://kauth.kakao.com" && url.pathname === "/oauth/token") {
      const q = new URLSearchParams(new TextDecoder().decode(await req.arrayBuffer()));
      kseen.push(Object.fromEntries(q));
      const ok = q.get("code")?.startsWith("ok-");
      return Response.json(ok ? { access_token: "at-" + q.get("code")!.slice(3) } : { error: "invalid_grant" }, { status: ok ? 200 : 400 });
    }
    if (url.origin === "https://kapi.kakao.com" && url.pathname === "/v1/user/access_token_info") {
      const at = (req.headers.get("authorization") ?? "").replace("Bearer at-", "");
      return Response.json({ id: Number(at) });
    }
    return realFetch(input as RequestInfo, init);
  }) as typeof fetch;

describe("poll", () => {
  beforeAll(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(kakaoFetch(globalThis.fetch.bind(globalThis)));
  });
  afterAll(() => vi.restoreAllMocks());

  let tA = "";
  let tB = "";
  let o1 = 0;

  it("초기 상태와 인증 필요", async () => {
    const g = await state();
    expect([g.options, g.total, g.myVote, g.mode]).toEqual([[], 0, null, "device"]);
    expect((await addOpt("x")).status).toBe(401);
    expect((await castVote(1)).status).toBe(401);
  });

  it("항목 추가와 검증", async () => {
    tA = await tok();
    tB = await tok();
    for (const t of ["", "   ", "a".repeat(31), "a\u0007b", "a\tb", "a\nb", 123, null]) expect((await addOpt(t, tA)).status, JSON.stringify(t)).toBe(400);
    expect((await pc("/poll/options", { method: "POST", body: {}, token: tA })).status).toBe(400);
    const r = await addOpt("  Vampire    Bat ", tA);
    expect(r.status).toBe(201);
    const g = await json<State>(r);
    o1 = g.created!;
    expect(g.options).toEqual([{ id: o1, text: "Vampire Bat", votes: 0, mine: true }]);
    expect((await state(tB)).options[0]!.mine).toBe(false);
    expect((await state()).options[0]!.mine).toBe(false);
    expect((await addOpt("vampire bat", tB)).status).toBe(409);
    expect((await json<State>(await addOpt("VAMPIRE BAT", tB))).error).toBe("duplicate");
    expect((await addOpt("Ghost", tA)).status).toBe(201);
    const lim = await addOpt("Mummy", tA);
    expect(lim.status).toBe(409);
    expect((await json<State>(lim)).error).toBe("limit");
  });

  it("투표와 중복 방지", async () => {
    expect((await castVote(999, tB)).status).toBe(404);
    expect((await castVote("1", tB)).status).toBe(400);
    let r = await castVote(o1, tB);
    expect(r.status).toBe(200);
    let g = await json<State>(r);
    expect(g.total).toBe(1);
    expect(g.myVote).toBe(o1);
    r = await castVote(o1, tB);
    expect(r.status).toBe(409);
    g = await json<State>(r);
    expect([g.error, g.total, g.myVote]).toEqual(["already", 1, o1]);
    expect((await state()).myVote).toBeNull();

    const tC = await tok();
    const rs = await Promise.all(Array.from({ length: 10 }, () => castVote(o1, tC)));
    expect(rs.map((x) => x.status).sort()).toEqual([200, ...Array(9).fill(409)]);
    expect((await state()).total).toBe(2);
  });

  it("위조 토큰 거부", async () => {
    const sTamper = tA.slice(0, -2) + (tA.endsWith("AA") ? "BB" : "AA");
    const [pA, sA] = tA.split(".");
    const forged = btoa(JSON.stringify({ vk: "device:evil", exp: Date.now() + 1e9 })).replace(/=+$/, "") + "." + sA;
    for (const t of [
      sTamper,
      forged,
      "garbage",
      `${pA}.${sA}.x`,
      await mint({ vk: "device:z", exp: Date.now() - 1000 }),
      await mint({ vk: "device:z", exp: Date.now() + 1e9 }, "other-secret"),
      await mint({ vk: 5, exp: Date.now() + 1e9 }),
    ])
      expect((await castVote(o1, t)).status, t).toBe(401);
    expect((await state(sTamper)).myVote).toBeNull();
    expect((await castVote(o1, await mint({ vk: "device:minted", exp: Date.now() + 1e9 }))).status).toBe(200);

    expect(JSON.stringify(await state(tB))).not.toMatch(/voter_key|creator_key|ip_hash|device:|vk/);
    expect((await pc("/poll")).headers.get("cache-control")).toMatch(/no-store/);
  });

  it("항목 텍스트: NFKC 정규화, 서식 문자 거부", async () => {
    const tN = await tok();
    const tN2 = await tok();
    for (const t of ["a​b", "a‍b", "‮abc", "﻿abc", "a⁠b", "­abc"]) expect((await addOpt(t, tN, "10.7.7.7")).status, JSON.stringify(t)).toBe(400);
    let r = await addOpt("ＮＦＫＣ　Ｔｅｓｔ", tN, "10.7.7.7");
    expect(r.status).toBe(201);
    expect((await json<State>(r)).options.some((o) => o.text === "NFKC Test")).toBe(true);
    r = await addOpt("nfkc test", tN2, "10.7.7.7");
    expect(r.status).toBe(409);
    expect((await json<State>(r)).error).toBe("duplicate");
    expect((await addOpt("ｎｆｋｃ ｔｅｓｔ", tN2, "10.7.7.7")).status).toBe(409);
  });

  it("IP 당 항목 추가 제한", async () => {
    const rl: number[] = [];
    for (let i = 0; i <= POLL.ipN; i++) rl.push((await addOpt(`rate${i}`, await tok(), "10.9.9.9")).status);
    expect(rl).toEqual([...Array(POLL.ipN).fill(201), 429]);
  });

  it("관리자 삭제와 정원", async () => {
    expect((await pc(`/poll/options/${o1}`, { method: "DELETE" })).status).toBe(403);
    expect((await pc(`/poll/options/${o1}`, { method: "DELETE", token: tA })).status).toBe(403);
    expect((await pc(`/poll/options/${o1}`, { method: "DELETE", token: "test-admin" })).status).toBe(204);
    const g = await state(tB);
    expect(g.options.some((o) => o.id === o1)).toBe(false);
    expect(g.total).toBe(0);
    expect((await castVote(o1, await tok())).status).toBe(404);

    let k = 0;
    while ((await state()).options.length < 20) {
      expect((await addOpt(`fill${k}`, await tok(), `10.2.${k >> 2}.1`)).status).toBe(201);
      k++;
    }
    const r = await addOpt("one too many", await tok(), "10.3.0.1");
    expect(r.status).toBe(409);
    expect((await json<State>(r)).error).toBe("full");
  });

  it("투표 CORS와 405", async () => {
    expect((await pc("/poll", { origin: "https://evil.example" })).headers.get("access-control-allow-origin")).toBeNull();
    expect((await pc("/poll", { origin: "https://evil.example" })).status).toBe(200);
    expect((await pc("/poll", { method: "OPTIONS" })).headers.get("access-control-allow-headers")).toMatch(/Authorization/);
    expect((await pc("/poll", { method: "POST", body: {} })).status).toBe(405);
  });

  it("카카오 성공 로그인은 시도 한도를 소모하지 않음", async () => {
    const s: number[] = [];
    for (let i = 0; i < KAKAO_IP_N + 3; i++)
      s.push((await pc("/auth/kakao", { method: "POST", body: { code: "ok-5550001", redirectUri: REDIR }, ip: "10.8.8.8" })).status);
    expect([...new Set(s)]).toEqual([200]);
  });

  it("카카오 교환(모의 서버)", async () => {
    const kk = (body: unknown) => pc("/auth/kakao", { method: "POST", body });
    let r = await kk({ code: "ok-7777777001", redirectUri: REDIR });
    expect(r.status).toBe(200);
    const kt = ((await r.json()) as { token: string }).token;
    expect(kseen.at(-1)).toEqual({ grant_type: "authorization_code", client_id: "rk", redirect_uri: REDIR, code: "ok-7777777001", client_secret: "cs" });
    expect(payloadOf(kt)).not.toContain("7777777001");
    const optK = (await state(kt)).options[0]!.id;
    expect((await castVote(optK, kt)).status).toBe(200);
    const kt2 = ((await (await kk({ code: "ok-7777777001", redirectUri: REDIR })).json()) as { token: string }).token;
    expect((await castVote(optK, kt2)).status).toBe(409);
    expect((await state(kt2)).myVote).toBe(optK);
    const kt3 = ((await (await kk({ code: "ok-7777777002", redirectUri: REDIR })).json()) as { token: string }).token;
    expect((await castVote(optK, kt3)).status).toBe(200);
    r = await kk({ code: "bad-code", redirectUri: REDIR });
    expect(r.status).toBe(401);
    expect(((await r.json()) as { token?: string }).token).toBeFalsy();
    expect((await kk({ code: "ok-1", redirectUri: "https://evil.example/" })).status).toBe(400);
    expect((await kk({ code: "ok-1", redirectUri: "http://localhost:4321/wedding/" })).status).toBe(200);
    expect((await kk({ redirectUri: REDIR })).status).toBe(400);
    expect((await pc("/auth/kakao", { method: "GET" })).status).toBe(405);
  });

  it("카카오 모드(VOTE_MODE 없음)에서는 device 토큰 거부", async () => {
    /* 원본 시나리오는 별도 DB 를 사용하므로 투표 테이블 초기화로 동일 조건 재현 */
    await env.DB.batch([env.DB.prepare("DELETE FROM poll_votes"), env.DB.prepare("DELETE FROM poll_options")]);
    const cw = (path: string, token?: string, method = "GET", body?: unknown) =>
      callWith({ VOTE_MODE: undefined, ADMIN_TOKEN: undefined }, path, { method, body, token });
    expect(((await (await cw("/poll")).json()) as State).mode).toBe("kakao");
    expect((await cw("/auth/device", undefined, "POST")).status).toBe(404);
    const devTok = await mint({ vk: "device:minted", exp: Date.now() + 1e9 }, SECRET);
    expect((await cw("/poll/options", devTok, "POST", { text: "x" })).status).toBe(401);
    expect((await cw("/poll/vote", devTok, "POST", { optionId: 1 })).status).toBe(401);
    const kakaoTok = await mint({ vk: "kakao-user-key", exp: Date.now() + 1e9 });
    expect((await cw("/poll/options", kakaoTok, "POST", { text: "x" })).status).toBe(201);
  });
});
