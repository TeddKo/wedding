/** 모션 감소 선호 여부. SSR 에서는 false. */
export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 결혼식까지 남은 일수 (Asia/Seoul 기준 날짜 차이). 양수=전, 0=당일, 음수=후 */
export function ddayKst(date: string, now = Date.now()) {
  const [y, m, d] = date.split("-").map(Number);
  const kst = new Date(now + 9 * 3600e3);
  const today = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  return Math.round((Date.UTC(y, m - 1, d) - today) / 864e5);
}
