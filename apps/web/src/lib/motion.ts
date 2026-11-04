/** 모션 감소 선호 여부. SSR 에서는 false. */
export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** easeOutCubic. t 는 0..1 */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** 문자열을 grapheme 단위로 분할. Intl.Segmenter 가 없으면 Array.from(코드포인트) 폴백. */
export function graphemes(text: string): string[] {
  const Seg = (Intl as { Segmenter?: new (l?: string, o?: { granularity: "grapheme" }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  return Array.from(text);
}

/** 공백 기준 단어 배열. 각 단어는 grapheme 배열, 공백은 제거. */
export function splitWords(text: string): string[][] {
  return text.split(/\s+/).filter(Boolean).map(graphemes);
}

/**
 * 숫자 롤. text 안의 모든 숫자 덩어리를 from → 목표값으로 보간.
 * 자릿수는 원문 길이로 0 채움(폭 고정). 4자리 이상(연도 등)은 롤 없이 고정. p>=1 이면 원문 그대로.
 */
export function countText(text: string, p: number, from = 0): string {
  if (p >= 1) return text;
  const e = easeOutCubic(p);
  return text.replace(/\d+/g, (m) => (m.length >= 4 ? m : String(Math.round(lerp(from, Number(m), e))).padStart(m.length, "0")));
}

/** 텍스트에 롤 가능한 숫자가 있는지 여부 */
export const hasDigits = (text: string) => /\d/.test(text);

/** 6자 이상 16진 해시 문자열인지 여부(scramble 대상) */
export const isHex = (text: string) => /^[0-9a-f]{6,}$/i.test(text.trim());

/**
 * 해시 스크램블. 프레임 0..frames-1 동안 같은 길이의 16진 난수열, 이후 target.
 * rng 는 테스트용 주입(기본 Math.random).
 */
export function scrambleHex(target: string, p: number, frames = 6, rng: () => number = Math.random): string {
  if (p >= 1 || Math.floor(p * frames) >= frames) return target;
  let out = "";
  for (let i = 0; i < target.length; i++) out += Math.floor(rng() * 16).toString(16);
  return out;
}
