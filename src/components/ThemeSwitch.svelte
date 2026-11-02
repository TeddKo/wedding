<script lang="ts">
  import { THEMES } from "../lib/themes";
  import { nextTheme, setTheme, theme } from "../lib/theme.svelte";

  let ready = $state(false);
  $effect(() => {
    ready = true;
  });
  const next = $derived(nextTheme(theme.name));

</script>

<!-- 테마 순환 버튼. SSR 에서는 숨겨 두고 하이드레이션 후 현재 테마로 표시 -->
<button
  type="button"
  class="theme-toggle"
  hidden={!ready}
  aria-label="테마 바꾸기: 현재 {THEMES[theme.name].label}, 다음 {THEMES[next].label}"
  title="테마: {THEMES[theme.name].label}"
  onclick={() => setTheme(next)}
>
  <svg data-th="halloween" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.4A7 7 0 0 1 15.5 3.5z" fill="currentColor" /></svg>
  <svg data-th="dev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
  <svg data-th="puppy" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="currentColor"><ellipse cx="12" cy="15.5" rx="5" ry="4.3" /><ellipse cx="5.6" cy="10" rx="2.1" ry="2.7" /><ellipse cx="9.3" cy="5.8" rx="2.1" ry="2.7" /><ellipse cx="14.7" cy="5.8" rx="2.1" ry="2.7" /><ellipse cx="18.4" cy="10" rx="2.1" ry="2.7" /></g></svg>
</button>
