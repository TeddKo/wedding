import { db } from "./db/client";
import type { Env } from "./env";
import { ORPHAN_MS } from "./limits";
import { purgeFails } from "./repo/fails";
import { deleteUpload, orphanUploads } from "./repo/uploads";

/** ORPHAN_MS 넘게 커밋되지 않은 업로드의 R2 객체와 행 삭제, 만료된 비밀번호 실패 기록 정리 */
export async function sweep(env: Env) {
  const d = db(env);
  const rows = await orphanUploads(d, Date.now() - (Number(env.ORPHAN_MS) || ORPHAN_MS));
  const [first, ...rest] = rows.map((r) => deleteUpload(d, r.uuid));
  if (first) {
    await env.BUCKET.delete(rows.flatMap((r) => [`full/${r.uuid}.${r.ext}`, `thumb/${r.uuid}.${r.ext}`]));
    await d.batch([first, ...rest]);
  }
  await purgeFails(d);
}
