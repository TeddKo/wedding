import { PHOTO_EXTS, PHOTO_KINDS } from "@wedding/shared";
import { Hono } from "hono";
import { db } from "../db/client";
import type { AppEnv } from "../env";
import { fail, notAllowed } from "../errors";
import { IMMUTABLE } from "../limits";
import { visibleExt } from "../repo/photos";
import { UUID } from "./photos";

export const images = new Hono<AppEnv>()
  .get(`/p/:uuid/:kind{${PHOTO_KINDS.join("|")}}`, async (c) => {
    const { uuid, kind } = c.req.param();
    const url = new URL(c.req.url);
    if (!UUID.test(uuid) || url.pathname !== `/p/${uuid}/${kind}`) return fail(404, "not found");
    const key = `${url.origin}/p/${uuid}/${kind}`;
    const hit = await caches.default.match(key);
    if (hit) return new Response(hit.body, hit);
    const row = await visibleExt(db(c.env), uuid);
    const obj = row && (await c.env.BUCKET.get(`${kind}/${uuid}.${row.ext}`));
    if (!obj) return fail(404, "not found");
    const res = new Response(obj.body, {
      headers: {
        "Content-Type": PHOTO_EXTS[row.ext],
        "Cache-Control": IMMUTABLE,
        ETag: `"${uuid}-${kind}"`,
        "Content-Disposition": `inline; filename="${uuid}.${row.ext}"`,
      },
    });
    c.executionCtx.waitUntil(caches.default.put(key, res.clone()));
    return res;
  })
  .all(`/p/:uuid/:kind{${PHOTO_KINDS.join("|")}}`, notAllowed);
