<script lang="ts">
  import { THEMES } from "../lib/themes";
  import { nextTheme, setTheme, theme } from "../lib/theme.svelte";

  let ready = $state(false);
  $effect(() => {
    ready = true;
  });
  const next = $derived(nextTheme(theme.name));
  let turn = $state(0);

  /** 지원 브라우저는 View Transition 으로 크로스페이드(모션 감소 시 즉시 전환), 아이콘은 반 바퀴 회전 */
  function swap() {
    const to = next;
    turn += 1;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => setTheme(to));
    else setTheme(to);
  }

</script>

<!-- 테마 순환 버튼. SSR 에서는 숨겨 두고 하이드레이션 후 표시 -->
<button
  type="button"
  class="fab theme-toggle"
  hidden={!ready}
  aria-label="테마 바꾸기: 현재 {THEMES[theme.name].label}, 다음 {THEMES[next].label}"
  title="테마: {THEMES[theme.name].label}"
  onclick={swap}
>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="transform: rotate({turn * 180}deg)"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" /></svg>
</button>

<style>
  .theme-toggle svg { transition: transform 520ms var(--e-spring, cubic-bezier(.34, 1.56, .64, 1)); }
  :global(::view-transition-old(root)), :global(::view-transition-new(root)) { animation-duration: 380ms; animation-timing-function: var(--e-io, ease-in-out); }
  @media (prefers-reduced-motion: reduce) { .theme-toggle svg { transition: none; } }
</style>
