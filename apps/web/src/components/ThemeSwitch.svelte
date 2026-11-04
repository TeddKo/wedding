<script lang="ts">
  import { THEMES } from "../lib/themes";
  import { nextTheme, setTheme, theme } from "../lib/theme.svelte";

  let ready = $state(false);
  $effect(() => {
    ready = true;
  });
  const next = $derived(nextTheme(theme.name));
  let turn = $state(0);

  let busy = false;
  let btn = $state<HTMLButtonElement>();
  const frame = () => new Promise<unknown>((r) => requestAnimationFrame(r));

  /** 맨 위로 이동하면 FAB 이 숨겨져 포커스가 body 로 빠짐. 버튼이 보이면 되돌리고, 숨겨져 있으면 main 으로 이동 */
  function keepFocus() {
    if (!btn || document.activeElement === btn) return;
    if (document.activeElement && document.activeElement !== document.body) return;
    if (btn.checkVisibility({ checkVisibilityCSS: true })) return btn.focus({ preventScroll: true });
    const main = document.querySelector<HTMLElement>("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
  }

  /**
   * 테마 전환: 중립색 베일이 250ms 로 화면을 덮은 동안 맨 위로 이동, wedding:theme-reset 으로 Reveal 초기화, 테마 적용(레일/시그니처는 Fx 가 재시작) 후 베일 해제.
   * 모션 감소 시 베일 없이 즉시 전환. 아이콘은 반 바퀴 회전
   */
  async function swap() {
    if (busy) return;
    const to = next;
    turn += 1;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setTheme(to);
    busy = true;
    const veil = document.createElement("div");
    veil.setAttribute("aria-hidden", "true");
    veil.style.cssText = "position:fixed;inset:0;z-index:1000;background:#f3f0eb;opacity:0;pointer-events:auto";
    document.body.append(veil);
    try {
      await veil.animate({ opacity: [0, 1] }, { duration: 250, easing: "ease-out", fill: "forwards" }).finished;
      scrollTo({ top: 0, behavior: "instant" });
      dispatchEvent(new CustomEvent("wedding:theme-reset"));
      setTheme(to);
      await frame();
      await frame();
      await new Promise((r) => setTimeout(r, 160));
      keepFocus();
      await veil.animate({ opacity: [1, 0] }, { duration: 250, easing: "ease-in", fill: "forwards" }).finished;
    } finally {
      veil.remove();
      busy = false;
    }
  }

</script>

<!-- 테마 순환 버튼. SSR 에서는 숨겨 두고 하이드레이션 후 표시 -->
<button
  type="button"
  class="fab theme-toggle"
  hidden={!ready}
  bind:this={btn}
  aria-label="테마 바꾸기: 현재 {THEMES[theme.name].label}, 다음 {THEMES[next].label}"
  title="테마: {THEMES[theme.name].label}"
  onclick={swap}
>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="transform: rotate({turn * 180}deg)"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" /></svg>
</button>

<style>
  .theme-toggle svg { transition: transform 520ms var(--e-out); }
  @media (prefers-reduced-motion: reduce) { .theme-toggle svg { transition: none; } }
</style>
