<script lang="ts">
  import { THEMES } from "../lib/themes";
  import { nextTheme, setTheme, theme } from "../lib/theme.svelte";

  let ready = $state(false);
  $effect(() => {
    ready = true;
  });
  const next = $derived(nextTheme(theme.name));

</script>

<!-- 테마 순환 버튼. SSR 에서는 숨겨 두고 하이드레이션 후 표시 -->
<button
  type="button"
  class="fab theme-toggle"
  hidden={!ready}
  aria-label="테마 바꾸기: 현재 {THEMES[theme.name].label}, 다음 {THEMES[next].label}"
  title="테마: {THEMES[theme.name].label}"
  onclick={() => setTheme(next)}
>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" /></svg>
</button>
