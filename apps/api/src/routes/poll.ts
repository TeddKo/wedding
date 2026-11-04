import { pollOptionCreate, pollVote } from "@wedding/shared/schemas";
import { Hono } from "hono";
import { isAdmin, requireSession, session } from "../auth";
import { db } from "../db/client";
import type { AppEnv } from "../env";
import { fail, notAllowed } from "../errors";
import { ipHash, json, noContent, parseBody, readJsonObject } from "../http";
import { hideOption } from "../repo/poll";
import { addOption, pollState, vote } from "../services/poll";

export const poll = new Hono<AppEnv>()
  .get("/poll", async (c) => json(c, await pollState(c.env, await session(c))))
  .all("/poll", notAllowed)
  .post("/poll/options", async (c) => {
    const vk = await requireSession(c);
    const body = await readJsonObject(c);
    if (!body) fail(400, "invalid body");
    const { text } = parseBody(pollOptionCreate, body, { text: "invalid text" });
    return json(c, await addOption(c.env, vk, await ipHash(c), text), 201);
  })
  .all("/poll/options", notAllowed)
  .post("/poll/vote", async (c) => {
    const vk = await requireSession(c);
    const body = await readJsonObject(c);
    if (!body) fail(400, "invalid body");
    const { optionId } = parseBody(pollVote, body, { optionId: "invalid option" });
    return json(c, await vote(c.env, vk, optionId));
  })
  .all("/poll/vote", notAllowed)
  .delete("/poll/options/:id{[0-9]+}", async (c) => {
    if (!(await isAdmin(c))) fail(403, "forbidden");
    await hideOption(db(c.env), Number(c.req.param("id")));
    return noContent(c);
  })
  .all("/poll/options/:id{[0-9]+}", notAllowed);
