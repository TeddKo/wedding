import { POLL } from "@wedding/shared";
import { db } from "../db/client";
import type { Env } from "../env";
import { fail } from "../errors";
import { LIMIT_MS } from "../limits";
import { countOptionsByCreator, countOptionsByIp, countVisibleOptions, insertOption, insertVote, myVote, optionVisible, pollRows } from "../repo/poll";

export async function pollState(env: Env, vk: string | null) {
  const d = db(env);
  const rows = await pollRows(d);
  return {
    mode: env.VOTE_MODE === "device" ? "device" : "kakao",
    options: rows.map((o) => ({ id: o.id, text: o.text, votes: o.votes, mine: !!vk && o.creatorKey === vk })),
    total: rows.reduce((a, o) => a + o.votes, 0),
    myVote: vk ? await myVote(d, vk) : null,
  };
}

/** 신규 투표면 200 상태, 이미 투표했으면 409 */
export async function vote(env: Env, vk: string, optionId: number) {
  const d = db(env);
  if (!(await optionVisible(d, optionId))) fail(404, "not found");
  const inserted = await insertVote(d, vk, optionId);
  const state = await pollState(env, vk);
  return inserted ? state : fail(409, "already", state);
}

export async function addOption(env: Env, vk: string, ip: string, text: string) {
  const d = db(env);
  if ((await countOptionsByIp(d, ip, Date.now() - LIMIT_MS)) >= POLL.ipN) fail(429, "too many");
  if ((await countVisibleOptions(d)) >= POLL.max) fail(409, "full");
  if ((await countOptionsByCreator(d, vk)) >= POLL.perCreator) fail(409, "limit");
  const row = await insertOption(d, { text, norm: text.toLowerCase(), creatorKey: vk, ipHash: ip, createdAt: Date.now() });
  if (!row) fail(409, "duplicate");
  return { ...(await pollState(env, vk)), created: row.id };
}
