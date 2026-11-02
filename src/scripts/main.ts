import { initAudio } from "./audio";

const $ = <T extends Element>(s: string) => document.querySelector<T>(s);
const cfg = document.body.dataset;

initAudio($<HTMLButtonElement>("#bgm-toggle"), cfg.bgm ?? "");

/* 티맵: 앱 스킴 시도 후 앱이 없으면 카카오맵 검색으로 대체 */
$<HTMLAnchorElement>("[data-tmap]")?.addEventListener("click", (e) => {
  const a = e.currentTarget as HTMLAnchorElement;
  const fallback = a.dataset.fallback ?? "";
  const t = setTimeout(() => {
    if (!document.hidden) location.href = fallback;
  }, 1500);
  document.addEventListener("visibilitychange", () => clearTimeout(t), { once: true });
});
