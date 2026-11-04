import { REDIRECT_URI } from "@wedding/shared";
import { kakaoAuth } from "@wedding/shared/schemas";
import { Hono } from "hono";
import { kakaoId } from "../adapters/kakao";
import { sign } from "../auth";
import { b64u, hmacSign } from "../domain/crypto";
import type { AppEnv, Env } from "../env";
import { fail, notAllowed } from "../errors";
import { db } from "../db/client";
import { ipHash, json, parseBody, readJsonObject } from "../http";
import { KAKAO_IP_N } from "../limits";
import { takeAttempt } from "../repo/fails";

const LOCAL_REDIRECT = /^http:\/\/(localhost|127\.0\.0\.1):\d{1,5}\/wedding\/$/;
const redirectAllowed = (u: string, env: Env) => u === REDIRECT_URI || (env.ALLOW_LOCAL === "1" && LOCAL_REDIRECT.test(u));

export const auth = new Hono<AppEnv>()
  .post("/auth/device", async (c) => {
    if (c.env.VOTE_MODE !== "device") fail(404, "not found");
    return json(c, { token: await sign(`device:${crypto.randomUUID()}`, c.env) });
  })
  .all("/auth/device", notAllowed)
  .post("/auth/kakao", async (c) => {
    const body = await readJsonObject(c);
    if (!body) fail(400, "invalid body");
    const { code, redirectUri } = parseBody(kakaoAuth, body);
    if (!redirectAllowed(redirectUri, c.env)) fail(400, "invalid body");
    const release = await takeAttempt(db(c.env), `kakao:${await ipHash(c)}`, KAKAO_IP_N);
    let id: string | null;
    try {
      id = await kakaoId(code, redirectUri, c.env);
    } catch {
      return fail(502, "kakao unavailable");
    }
    if (!id) fail(401, "kakao");
    await release();
    return json(c, { token: await sign(b64u(await hmacSign(c.env.VOTER_PEPPER, `kakao:${id}`)), c.env) });
  })
  .all("/auth/kakao", notAllowed);
