export const ORIGIN = "https://teddko.github.io";
export const REDIRECT_URI = `${ORIGIN}/wedding/`;

export const MAX_BODY = 4096;
export const ENTRY = { name: { min: 1, max: 20 }, message: { min: 1, max: 300 }, password: { min: 4, max: 64 }, defaultLimit: 10, maxLimit: 30 } as const;
export const PHOTO = { defaultLimit: 30, maxLimit: 30, cap: { full: 3 * 1024 * 1024, thumb: 200 * 1024 }, dim: { full: 2560, thumb: 480 } } as const;
export const POLL = { max: 20, perCreator: 2, ipN: 5, len: 30 } as const;

export const PHOTO_KINDS = ["full", "thumb"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export const PHOTO_EXTS = { webp: "image/webp", jpg: "image/jpeg" } as const;
export type PhotoExt = keyof typeof PHOTO_EXTS;

export const ERROR_CODES = [
  "invalid body",
  "invalid name",
  "invalid message",
  "invalid password",
  "invalid uuid",
  "invalid device",
  "invalid option",
  "invalid text",
  "invalid dimensions",
  "unauthorized",
  "forbidden",
  "wrong password",
  "no password",
  "not found",
  "method not allowed",
  "exists",
  "upload incomplete",
  "type mismatch",
  "duplicate",
  "full",
  "limit",
  "already",
  "too large",
  "unsupported type",
  "too many",
  "too many posts",
  "too many attempts",
  "too many uploads",
  "kakao",
  "kakao unavailable",
  "server error",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
