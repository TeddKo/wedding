import { z } from "zod";
import { ENTRY, POLL, PHOTO_EXTS } from "./index";

const hasCtrl = (s: string) => /[\u0000-\u001f\u007f-\u009f]/.test(s);

const text = (min: number, max: number, multiline = false) =>
  z.string().transform((v, ctx) => {
    let t = v.trim();
    if (multiline) t = t.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
    const checked = multiline ? t.replace(/\n/g, "") : t;
    if (t.length < min || t.length > max || hasCtrl(checked)) {
      ctx.addIssue({ code: "custom", message: "invalid" });
      return z.NEVER;
    }
    return t;
  });

const pollText = z.string().transform((v, ctx) => {
  const raw = v.normalize("NFKC");
  const t = raw.replace(/\s+/g, " ").trim();
  if (!raw || hasCtrl(raw) || /\p{Cf}/u.test(raw) || t.length < 1 || t.length > POLL.len) {
    ctx.addIssue({ code: "custom", message: "invalid" });
    return z.NEVER;
  }
  return t;
});

/* 요청 */
export const entryCreate = z.object({
  name: text(ENTRY.name.min, ENTRY.name.max),
  message: text(ENTRY.message.min, ENTRY.message.max, true),
  password: text(ENTRY.password.min, ENTRY.password.max),
});
export const entryDelete = z.object({ password: z.string() });
export const photoCommit = z.object({ pw: text(ENTRY.password.min, ENTRY.password.max).optional() });
export const photoDelete = z.object({ pw: z.string().optional() });
export const pollOptionCreate = z.object({ text: pollText });
export const pollVote = z.object({ optionId: z.number().int() });
export const kakaoAuth = z.object({ code: z.string().min(1).max(512), redirectUri: z.string() });

/* 응답 */
export const entry = z.object({ id: z.number(), name: z.string(), message: z.string(), created_at: z.number() });
export const entryList = z.object({ items: z.array(entry), nextCursor: z.number().nullable() });
export const photo = z.object({
  id: z.number(),
  uuid: z.string(),
  w: z.number(),
  h: z.number(),
  created_at: z.number(),
  ext: z.enum(Object.keys(PHOTO_EXTS) as [keyof typeof PHOTO_EXTS, ...(keyof typeof PHOTO_EXTS)[]]),
  locked: z.boolean(),
  thumb: z.string(),
  full: z.string(),
});
export const photoList = z.object({ items: z.array(photo), nextCursor: z.number().nullable(), total: z.number().optional() });
export const pollState = z.object({
  mode: z.string(),
  options: z.array(z.object({ id: z.number(), text: z.string(), votes: z.number(), mine: z.boolean() })),
  total: z.number(),
  myVote: z.number().nullable(),
});
export const token = z.object({ token: z.string() });
export const apiError = z.object({ error: z.string() });

export type EntryCreate = z.infer<typeof entryCreate>;
export type Entry = z.infer<typeof entry>;
export type EntryList = z.infer<typeof entryList>;
export type Photo = z.infer<typeof photo>;
export type PhotoList = z.infer<typeof photoList>;
export type PollState = z.infer<typeof pollState>;
