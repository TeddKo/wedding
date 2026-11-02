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
  {THEMES[theme.name].icon}
</button>
