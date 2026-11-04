import { array, boolean, enum as zenum, NEVER, number, object, string, type z } from "zod";
import { ENTRY, POLL, PHOTO_EXTS } from "./index";

const hasCtrl = (s: string) => /[\u0000-\u001f\u007f-\u009f]/.test(s);

const text = (min: number, max: number, multiline = false) =>
  string().transform((v, ctx) => {
    let t = v.trim();
    if (multiline) t = t.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
    const checked = multiline ? t.replace(/\n/g, "") : t;
    if (t.length < min || t.length > max || hasCtrl(checked)) {
      ctx.addIssue({ code: "custom", message: "invalid" });
      return NEVER;
    }
    return t;
  });

const POLL_RAW_MAX = POLL.len * 4;

const pollText = string().transform((v, ctx) => {
  if (v.length > POLL_RAW_MAX) {
    ctx.addIssue({ code: "custom", message: "invalid" });
    return NEVER;
  }
  const raw = v.normalize("NFKC");
  const t = raw.replace(/\s+/g, " ").trim();
  if (!raw || hasCtrl(raw) || /\p{Cf}/u.test(raw) || t.length < 1 || t.length > POLL.len) {
    ctx.addIssue({ code: "custom", message: "invalid" });
    return NEVER;
  }
  return t;
});

/* 요청 */
export const entryCreate = object({
  name: text(ENTRY.name.min, ENTRY.name.max),
  message: text(ENTRY.message.min, ENTRY.message.max, true),
  password: text(ENTRY.password.min, ENTRY.password.max),
});
export const entryDelete = object({ password: string() });
export const photoCommit = object({ pw: text(ENTRY.password.min, ENTRY.password.max).optional() });
export const photoDelete = object({ pw: string().optional() });
export const pollOptionCreate = object({ text: pollText });
export const pollVote = object({ optionId: number().int() });
export const kakaoAuth = object({ code: text(1, 512), redirectUri: string() });

/* 응답 */
export const entry = object({ id: number(), name: string(), message: string(), created_at: number() });
export const entryList = object({ items: array(entry), nextCursor: number().nullable() });
export const photo = object({
  id: number(),
  uuid: string(),
  w: number(),
  h: number(),
  created_at: number(),
  ext: zenum(Object.keys(PHOTO_EXTS) as [keyof typeof PHOTO_EXTS, ...(keyof typeof PHOTO_EXTS)[]]),
  locked: boolean(),
  thumb: string(),
  full: string(),
});
export const photoList = object({ items: array(photo), nextCursor: number().nullable(), total: number().optional() });
export const pollState = object({
  mode: string(),
  options: array(object({ id: number(), text: string(), votes: number(), mine: boolean() })),
  total: number(),
  myVote: number().nullable(),
});
export const token = object({ token: string() });
export const apiError = object({ error: string() });

export type EntryCreate = z.infer<typeof entryCreate>;
export type Entry = z.infer<typeof entry>;
export type EntryList = z.infer<typeof entryList>;
export type Photo = z.infer<typeof photo>;
export type PhotoList = z.infer<typeof photoList>;
export type PollState = z.infer<typeof pollState>;
