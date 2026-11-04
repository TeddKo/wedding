import { THEME_NAMES, THEMES, isTheme, type ThemeName } from "./themes";

/**
 * 현재 테마. 마크업은 이 값으로 분기 금지(SSR/하이드레이션 불일치 방지).
 * 마크업 변형은 `data-th` + CSS 로, JS 연출(캔버스, 날아가는 요소)만 이 값 참조.
 */
export const theme = $state<{ name: ThemeName }>({ name: "halloween" });

if (typeof document !== "undefined") {
  const cur = document.documentElement.dataset.theme;
  if (isTheme(cur)) theme.name = cur;
}

export function setTheme(name: ThemeName) {
  theme.name = name;
  document.documentElement.dataset.theme = name;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES[name].color);
  try {
    localStorage.setItem("theme", name);
  } catch {}
}

export const nextTheme = (name: ThemeName) => THEME_NAMES[(THEME_NAMES.indexOf(name) + 1) % THEME_NAMES.length];
