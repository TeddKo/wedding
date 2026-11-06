import { PHOTO, type PhotoKind } from "@wedding/shared";
import { photoCommit, photoDelete } from "@wedding/shared/schemas";
import { Hono } from "hono";
import { isAdmin } from "../auth";
import { db } from "../db/client";
import { safeEqStr, verifyPassword } from "../domain/crypto";
import type { AppEnv } from "../env";
import { fail } from "../errors";
import { ipHash, json, noContent, page, pageParams, parseBody, readCapped, readJsonObject } from "../http";
import { PHOTO_DEVICE_MAX, PW_FAIL_N } from "../limits";
import { takeAttempt } from "../repo/fails";
import { countUploadsByDevice } from "../repo/uploads";
import { countVisiblePhotos, listPhotos, type PhotoRow, photoAuth } from "../repo/photos";
import { commitPhoto, putImage, removePhoto } from "../services/photos";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DEVICE = /^[\w-]{8,64}$/;

const view = (p: PhotoRow, origin: string) => ({
  id: p.id,
  uuid: p.uuid,
  w: p.w,
  h: p.h,
  created_at: p.created_at,
  ext: p.ext,
  locked: !!p.locked,
  thumb: `${origin}/p/${p.uuid}/thumb`,
  full: `${origin}/p/${p.uuid}/full`,
});

export const photos = new Hono<AppEnv>()
  .get("/photos", async (c) => {
    const { limit, before } = pageParams(c, PHOTO.defaultLimit, PHOTO.maxLimit);
    const d = db(c.env);
    const origin = new URL(c.req.url).origin;
    const { items, nextCursor } = page(await listPhotos(d, before, limit), limit);
    const total = before === Number.MAX_SAFE_INTEGER ? await countVisiblePhotos(d) : undefined;
    return json(c, { items: items.map((p) => view(p, origin)), nextCursor, total });
  })
  .get("/photos/quota", async (c) => {
    const device = c.req.header("X-Device") ?? "";
    if (!DEVICE.test(device)) fail(400, "invalid device");
    return json(c, { left: Math.max(0, PHOTO_DEVICE_MAX - (await countUploadsByDevice(db(c.env), device))) });
  })
  .all("/photos", () => fail(400, "invalid uuid"))
  .all("/photos/:uuid/:sub?", async (c) => {
    const uuid = c.req.param("uuid");
    const sub = c.req.param("sub");
    if (!UUID.test(uuid)) fail(400, "invalid uuid");
    const device = c.req.header("X-Device") ?? "";
    const origin = new URL(c.req.url).origin;
    const method = c.req.method;

    if (method === "PUT" && (sub === "full" || sub === "thumb")) {
      const kind: PhotoKind = sub;
      if (!DEVICE.test(device)) fail(400, "invalid device");
      const declared = c.req.header("Content-Length") ?? "";
      if (!/^\d{1,15}$/.test(declared) || Number(declared) <= 0 || Number(declared) > PHOTO.cap[kind]) fail(413, "too large");
      await putImage(c.env, { uuid, kind, device, ip: await ipHash(c) }, () => readCapped(c.req.raw, PHOTO.cap[kind]));
      return noContent(c);
    }

    if (method === "POST" && sub === "commit") {
      if (!DEVICE.test(device)) fail(400, "invalid device");
      const body = await readJsonObject(c);
      if (!body) fail(400, "invalid body");
      const { pw } = parseBody(photoCommit, { pw: body.pw === "" ? undefined : body.pw }, { pw: "invalid password" });
      const { row, status } = await commitPhoto(c.env, { uuid, device, pw: pw ?? null });
      return json(c, view(row, origin), status);
    }

    if (method === "DELETE" && !sub) {
      const d = db(c.env);
      const row = await photoAuth(d, uuid);
      if (!row) fail(404, "not found");
      const admin = await isAdmin(c);
      if (!admin) {
        if (row.pwHash && row.salt) {
          const body = await readJsonObject(c);
          const parsed = body && photoDelete.safeParse(body);
          const pw = parsed && parsed.success ? (parsed.data.pw ?? "").trim() : "";
          if (!pw) fail(400, "invalid password");
          const ip = await ipHash(c);
          const release = await takeAttempt(d, ip, PW_FAIL_N);
          if (!(await verifyPassword(c.env.PW_PEPPER, pw, row.salt, row.pwHash))) fail(403, "wrong password");
          await release();
        } else if (!(row.deviceId && device && (await safeEqStr(device, row.deviceId)))) fail(403, "no password");
      }
      await removePhoto(c.env, uuid, row.ext, admin && c.req.query("hide") === "1");
      c.executionCtx.waitUntil(Promise.all(["full", "thumb"].map((k) => caches.default.delete(`${origin}/p/${uuid}/${k}`))));
      return noContent(c);
    }

    return fail(405, "method not allowed");
  });
