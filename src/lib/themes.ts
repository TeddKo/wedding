/** 테마 목록. key 는 `<html data-theme>` 값, color 는 브라우저 theme-color */
export const THEMES = {
  halloween: { label: "할로윈", color: "#EEE7DE" },
  dev: { label: "개발자", color: "#F6F6F3" },
  puppy: { label: "강아지", color: "#FAF6F1" },
} as const;

export type ThemeName = keyof typeof THEMES;
export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const isTheme = (v: unknown): v is ThemeName => typeof v === "string" && v in THEMES;
