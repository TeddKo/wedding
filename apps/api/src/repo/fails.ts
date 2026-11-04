import { and, eq, gt, lt } from "drizzle-orm";
import type { Db } from "../db/client";
import { pwFails } from "../db/schema";
import { FAIL_TTL_MS, LIMIT_MS } from "../limits";

export const countFails = (d: Db, ip: string) => d.$count(pwFails, and(eq(pwFails.ipHash, ip), gt(pwFails.createdAt, Date.now() - LIMIT_MS)));

export const recordFail = (d: Db, ip: string) => d.insert(pwFails).values({ ipHash: ip, createdAt: Date.now() });

export const purgeFails = (d: Db) => d.delete(pwFails).where(lt(pwFails.createdAt, Date.now() - FAIL_TTL_MS));
