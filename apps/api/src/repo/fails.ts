import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { pwFails } from "../db/schema";
import { fail } from "../errors";
import { FAIL_TTL_MS, LIMIT_MS } from "../limits";

const countFails = (d: Db, key: string) => d.$count(pwFails, and(eq(pwFails.ipHash, key), gt(pwFails.createdAt, Date.now() - LIMIT_MS)));

/** 시도를 먼저 기록한 뒤 집계해 병렬 요청의 한도 우회 차단. 초과면 429, 아니면 해당 시도 행 해제 함수 반환 */
export async function takeAttempt(d: Db, key: string, limit: number) {
  const [row] = await d.insert(pwFails).values({ ipHash: key, createdAt: Date.now() }).returning({ id: sql<number>`rowid` });
  const release = () => d.delete(pwFails).where(sql`rowid = ${row!.id}`);
  if ((await countFails(d, key)) > limit) {
    await release();
    fail(429, "too many attempts");
  }
  return release;
}

export const purgeFails = (d: Db) => d.delete(pwFails).where(lt(pwFails.createdAt, Date.now() - FAIL_TTL_MS));
