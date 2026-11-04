import type { ThemeName } from "../../lib/themes";

export type EntryCtx = { gate: HTMLElement };
export type Entry = {
  /** 클릭 후 stage.open 이 서는 시점(ms). 커버 안무가 게이트 뒤에서 시작됨 */
  lift: number;
  /** 클릭 후 게이트 DOM 을 제거하는 시점(ms). 연출은 이보다 60ms 먼저 끝남 */
  total: number;
  /** JS 가 필요한 연출. CSS 만으로 되는 테마는 생략 */
  run?: (ctx: EntryCtx) => Promise<void>;
};

export const loadDev = () => import("./entry-dev");

/** 테마별 진입 타이밍의 단일 출처. lift/total 은 게이트에 --ig-lift/--ig-total 로도 내려가 CSS 지속시간 생성 */
export const ENTRY: Record<ThemeName, Entry> = {
  halloween: { lift: 520, total: 1500 },
  puppy: { lift: 380, total: 1250 },
  dev: { lift: 900, total: 1600, run: async (ctx) => (await loadDev()).default(ctx) },
};
