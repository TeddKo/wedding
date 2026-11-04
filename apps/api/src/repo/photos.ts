import { and, desc, eq, lt, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { photos } from "../db/schema";

const viewCols = {
  id: photos.id,
  uuid: photos.uuid,
  ext: photos.ext,
  w: photos.w,
  h: photos.h,
  created_at: photos.createdAt,
  locked: sql<number>`${photos.pwHash} IS NOT NULL`,
};

export const listPhotos = (d: Db, before: number, limit: number) =>
  d
    .select(viewCols)
    .from(photos)
    .where(and(eq(photos.hidden, 0), lt(photos.id, before)))
    .orderBy(desc(photos.id))
    .limit(limit + 1);

export const countVisiblePhotos = (d: Db) => d.$count(photos, eq(photos.hidden, 0));

export const findPhoto = (d: Db, uuid: string) => d.select(viewCols).from(photos).where(eq(photos.uuid, uuid)).get();

export const visibleExt = (d: Db, uuid: string) =>
  d
    .select({ ext: photos.ext })
    .from(photos)
    .where(and(eq(photos.uuid, uuid), eq(photos.hidden, 0)))
    .get();

export const photoExists = async (d: Db, uuid: string) => (await d.$count(photos, eq(photos.uuid, uuid))) > 0;

export const photoAuth = (d: Db, uuid: string) =>
  d.select({ ext: photos.ext, pwHash: photos.pwHash, salt: photos.salt, deviceId: photos.deviceId }).from(photos).where(eq(photos.uuid, uuid)).get();

export const insertPhoto = (d: Db, v: typeof photos.$inferInsert) =>
  d.insert(photos).values(v).onConflictDoNothing({ target: photos.uuid }).returning({ id: photos.id }).get();

export const hidePhoto = (d: Db, uuid: string) => d.update(photos).set({ hidden: 1 }).where(eq(photos.uuid, uuid));

export const deletePhoto = (d: Db, uuid: string) => d.delete(photos).where(eq(photos.uuid, uuid));

export type PhotoRow = NonNullable<Awaited<ReturnType<typeof findPhoto>>>;
