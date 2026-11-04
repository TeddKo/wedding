import { and, asc, count, desc, eq, gt } from "drizzle-orm";
import type { Db } from "../db/client";
import { pollOptions, pollVotes } from "../db/schema";

export const pollRows = (d: Db) =>
  d
    .select({ id: pollOptions.id, text: pollOptions.text, creatorKey: pollOptions.creatorKey, votes: count(pollVotes.optionId) })
    .from(pollOptions)
    .leftJoin(pollVotes, eq(pollVotes.optionId, pollOptions.id))
    .where(eq(pollOptions.hidden, 0))
    .groupBy(pollOptions.id)
    .orderBy(desc(count(pollVotes.optionId)), asc(pollOptions.id));

export const myVote = async (d: Db, vk: string) =>
  (await d.select({ optionId: pollVotes.optionId }).from(pollVotes).where(eq(pollVotes.voterKey, vk)).get())?.optionId ?? null;

export const optionVisible = async (d: Db, id: number) => (await d.$count(pollOptions, and(eq(pollOptions.id, id), eq(pollOptions.hidden, 0)))) > 0;

export const insertVote = (d: Db, voterKey: string, optionId: number) =>
  d
    .insert(pollVotes)
    .values({ voterKey, optionId, createdAt: Date.now() })
    .onConflictDoNothing({ target: pollVotes.voterKey })
    .returning({ k: pollVotes.voterKey })
    .get();

export const countOptionsByIp = (d: Db, ip: string, since: number) => d.$count(pollOptions, and(eq(pollOptions.ipHash, ip), gt(pollOptions.createdAt, since)));

export const countVisibleOptions = (d: Db) => d.$count(pollOptions, eq(pollOptions.hidden, 0));

export const countOptionsByCreator = (d: Db, vk: string) => d.$count(pollOptions, eq(pollOptions.creatorKey, vk));

export const insertOption = (d: Db, v: typeof pollOptions.$inferInsert) =>
  d.insert(pollOptions).values(v).onConflictDoNothing({ target: pollOptions.norm }).returning({ id: pollOptions.id }).get();

export const hideOption = (d: Db, id: number) => d.update(pollOptions).set({ hidden: 1 }).where(eq(pollOptions.id, id));
