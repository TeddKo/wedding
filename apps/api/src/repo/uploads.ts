import { and, eq, gt, lt, notInArray } from "drizzle-orm";
import type { Db } from "../db/client";
import { photos, uploads } from "../db/schema";

export const findUpload = (d: Db, uuid: string) => d.select().from(uploads).where(eq(uploads.uuid, uuid)).get();

export const countUploadsByIp = (d: Db, ip: string, since: number) => d.$count(uploads, and(eq(uploads.ipHash, ip), gt(uploads.createdAt, since)));

export const countUploadsByDevice = (d: Db, device: string) => d.$count(uploads, eq(uploads.deviceId, device));

export const insertUpload = (d: Db, v: typeof uploads.$inferInsert) => d.insert(uploads).values(v).onConflictDoNothing();

export const setFullDims = (d: Db, uuid: string, w: number, h: number) => d.update(uploads).set({ fw: w, fh: h }).where(eq(uploads.uuid, uuid));

export const setThumbDims = (d: Db, uuid: string, w: number, h: number) => d.update(uploads).set({ tw: w, th: h }).where(eq(uploads.uuid, uuid));

export const deleteUpload = (d: Db, uuid: string) => d.delete(uploads).where(eq(uploads.uuid, uuid));

export const orphanUploads = (d: Db, cutoff: number) =>
  d
    .select({ uuid: uploads.uuid, ext: uploads.ext })
    .from(uploads)
    .where(and(lt(uploads.createdAt, cutoff), notInArray(uploads.uuid, d.select({ uuid: photos.uuid }).from(photos))))
    .limit(500);
