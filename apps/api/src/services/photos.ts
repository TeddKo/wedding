import { PHOTO, PHOTO_EXTS, type PhotoKind } from "@wedding/shared";
import { db } from "../db/client";
import { dims, sniff } from "../domain/image";
import { b64, pbkdf2 } from "../domain/crypto";
import type { Env } from "../env";
import { fail } from "../errors";
import { DIM_TOLERANCE, IMMUTABLE, LIMIT_MS, PHOTO_DEVICE_MAX, PHOTO_IP_N } from "../limits";
import { deletePhoto, findPhoto, hidePhoto, insertPhoto, type PhotoRow, photoExists } from "../repo/photos";
import { countUploadsByDevice, countUploadsByIp, deleteUpload, findUpload, insertUpload, setFullDims, setThumbDims } from "../repo/uploads";

/** 원본/썸네일 업로드. 값싼 검사(존재·한도) 후에만 본문을 읽는다 */
export async function putImage(env: Env, a: { uuid: string; kind: PhotoKind; device: string; ip: string }, readBody: () => Promise<Uint8Array | null>) {
  const d = db(env);
  const { uuid, kind } = a;
  if (await photoExists(d, uuid)) fail(409, "exists");
  if (!(await findUpload(d, uuid))) {
    if ((await countUploadsByIp(d, a.ip, Date.now() - LIMIT_MS)) >= PHOTO_IP_N || (await countUploadsByDevice(d, a.device)) >= PHOTO_DEVICE_MAX)
      fail(429, "too many uploads");
  }
  const bytes = (await readBody()) ?? fail(413, "too large");
  const ext = sniff(bytes.subarray(0, 12)) ?? fail(415, "unsupported type");
  const dm = dims(bytes, ext);
  if (!dm || Math.max(...dm) > PHOTO.dim[kind] + DIM_TOLERANCE) fail(422, "invalid dimensions");
  await insertUpload(d, { uuid, ext, ipHash: a.ip, deviceId: a.device, createdAt: Date.now() });
  if ((await findUpload(d, uuid))?.ext !== ext) fail(409, "type mismatch");
  await env.BUCKET.put(`${kind}/${uuid}.${ext}`, bytes, { httpMetadata: { contentType: PHOTO_EXTS[ext], cacheControl: IMMUTABLE } });
  const [w, h] = dm;
  await (kind === "full" ? setFullDims : setThumbDims)(d, uuid, w, h);
}

/** 이미 커밋된 사진이면 200, 새로 커밋하면 201 */
export async function commitPhoto(env: Env, a: { uuid: string; device: string; pw: string | null }): Promise<{ row: PhotoRow; status: 200 | 201 }> {
  const d = db(env);
  const { uuid } = a;
  const prev = await findPhoto(d, uuid);
  if (prev) return { row: prev, status: 200 };

  const up = await findUpload(d, uuid);
  const full = up?.fw && up.tw ? await env.BUCKET.head(`full/${uuid}.${up.ext}`) : null;
  if (!up || !full || !(await env.BUCKET.head(`thumb/${uuid}.${up.ext}`))) fail(409, "upload incomplete");

  const now = Date.now();
  const salt = a.pw ? crypto.getRandomValues(new Uint8Array(16)) : null;
  const hash = a.pw && salt ? b64(await pbkdf2(a.pw, salt)) : null;
  const row = await insertPhoto(d, {
    uuid,
    ext: up.ext,
    w: up.fw,
    h: up.fh,
    size: full.size,
    pwHash: hash,
    salt: salt && b64(salt),
    ipHash: up.ipHash,
    deviceId: up.deviceId ?? a.device,
    createdAt: now,
  });
  if (!row) {
    const again = await findPhoto(d, uuid);
    return again ? { row: again, status: 200 } : fail(409, "upload incomplete");
  }
  return { row: { id: row.id, uuid, ext: up.ext, w: up.fw, h: up.fh, created_at: now, locked: hash ? 1 : 0 }, status: 201 };
}

/** R2 객체와 행 제거. hide 면 사진 행은 숨김 처리만 */
export async function removePhoto(env: Env, uuid: string, ext: string, hide: boolean) {
  const d = db(env);
  await deleteUpload(d, uuid);
  await Promise.all([`full/${uuid}.${ext}`, `thumb/${uuid}.${ext}`].map((k) => env.BUCKET.delete(k)));
  await (hide ? hidePhoto(d, uuid) : deletePhoto(d, uuid));
}
