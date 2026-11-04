import { and, desc, eq, gt, lt } from "drizzle-orm";
import type { Db } from "../db/client";
import { entries } from "../db/schema";

export const listEntries = (d: Db, before: number, limit: number) =>
  d
    .select({ id: entries.id, name: entries.name, message: entries.message, created_at: entries.createdAt })
    .from(entries)
    .where(lt(entries.id, before))
    .orderBy(desc(entries.id))
    .limit(limit + 1);

export const countRecentEntries = (d: Db, ip: string, since: number) => d.$count(entries, and(eq(entries.ipHash, ip), gt(entries.createdAt, since)));

export const insertEntry = (d: Db, v: typeof entries.$inferInsert) => d.insert(entries).values(v).returning({ id: entries.id }).get();

export const entryCredentials = (d: Db, id: number) => d.select({ pwHash: entries.pwHash, salt: entries.salt }).from(entries).where(eq(entries.id, id)).get();

export const deleteEntry = (d: Db, id: number) => d.delete(entries).where(eq(entries.id, id));
