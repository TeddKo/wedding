import { detect } from "../lib/platform";

/**
 * 모바일/태블릿에서 페이지 핀치 줌과 더블탭 확대 차단. PC 는 그대로 유지.
 * viewport `user-scalable=no` 는 iOS Safari 가 무시하므로 gesture/touch 이벤트로 함께 차단.
 * 갤러리 라이트박스와 지도는 pointer/자체 이벤트로 확대하므로 영향 없음.
 */
export function lockZoom() {
  if (detect(navigator.userAgent, navigator.maxTouchPoints).os === "desktop") return;
  document.documentElement.classList.add("nozoom");
  const block = (e: Event) => e.preventDefault();
  for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, block, { passive: false });
  document.addEventListener("touchmove", (e) => e.touches.length > 1 && e.preventDefault(), { passive: false });
}
