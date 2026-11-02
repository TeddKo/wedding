/** 테마 목록. key 는 `<html data-theme>` 값, color 는 브라우저 theme-color */
export const THEMES = {
  halloween: { label: "할로윈", icon: "🎃", color: "#120d16" },
  dev: { label: "프로그래머", icon: "</>", color: "#0d1117" },
  puppy: { label: "강아지", icon: "🐾", color: "#fff8ef" },
} as const;

export type ThemeName = keyof typeof THEMES;
export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const isTheme = (v: unknown): v is ThemeName => typeof v === "string" && v in THEMES;
