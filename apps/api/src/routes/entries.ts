import { ENTRY } from "@wedding/shared";
import { entryCreate, entryDelete } from "@wedding/shared/schemas";
import { Hono } from "hono";
import { db } from "../db/client";
import { b64, pbkdf2, safeEqBytes, unb64 } from "../domain/crypto";
import type { AppEnv } from "../env";
import { fail, notAllowed } from "../errors";
import { ipHash, json, noContent, page, pageParams, parseBody, readJsonObject } from "../http";
import { ENTRY_IP_N, LIMIT_MS, PW_FAIL_N } from "../limits";
import { deleteEntry, entryCredentials, insertEntry, listEntries, countRecentEntries } from "../repo/entries";
import { countFails, recordFail } from "../repo/fails";

const ID = "/entries/:id{[0-9]+}";

export const entries = new Hono<AppEnv>()
  .get("/entries", async (c) => {
    const { limit, before } = pageParams(c, ENTRY.defaultLimit, ENTRY.maxLimit);
    return json(c, page(await listEntries(db(c.env), before, limit), limit));
  })
  .post("/entries", async (c) => {
    const body = await readJsonObject(c);
    if (!body) fail(400, "invalid body");
    const v = parseBody(entryCreate, body, { name: "invalid name", message: "invalid message", password: "invalid password" });
    const d = db(c.env);
    const ip = await ipHash(c);
    const now = Date.now();
    if ((await countRecentEntries(d, ip, now - LIMIT_MS)) >= ENTRY_IP_N) fail(429, "too many posts");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2(v.password, salt);
    const row = await insertEntry(d, { name: v.name, message: v.message, pwHash: b64(hash), salt: b64(salt), ipHash: ip, createdAt: now });
    return json(c, { id: row.id, name: v.name, message: v.message, created_at: now }, 201);
  })
  .all("/entries", notAllowed)
  .delete(ID, async (c) => {
    const body = await readJsonObject(c);
    const parsed = body && entryDelete.safeParse(body);
    const password = parsed && parsed.success ? parsed.data.password.trim() : "";
    if (!password) fail(400, "invalid password");
    const d = db(c.env);
    const id = Number(c.req.param("id"));
    const row = await entryCredentials(d, id);
    if (!row) fail(404, "not found");
    const ip = await ipHash(c);
    if ((await countFails(d, ip)) >= PW_FAIL_N) fail(429, "too many attempts");
    if (!safeEqBytes(await pbkdf2(password, unb64(row.salt)), unb64(row.pwHash))) {
      await recordFail(d, ip);
      fail(403, "wrong password");
    }
    await deleteEntry(d, id);
    return noContent(c);
  })
  .all(ID, notAllowed);
