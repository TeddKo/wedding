/** 테마 목록. key 는 `<html data-theme>` 값, color 는 브라우저 theme-color */
export const THEMES = {
  halloween: { label: "할로윈", color: "#EEE7DE" },
  dev: { label: "개발자", color: "#F6F6F3" },
  puppy: { label: "강아지", color: "#FAF6F1" },
} as const;

export type ThemeName = keyof typeof THEMES;
/** 방문자에게 열어 둔 테마. 1개면 테마 전환 FAB 이 숨고 인트로 선택지도 그 1개만 보인다(다른 테마 코드는 유지) */
export const THEME_NAMES: ThemeName[] = ["halloween"];
export const isTheme = (v: unknown): v is ThemeName => typeof v === "string" && (THEME_NAMES as string[]).includes(v);
