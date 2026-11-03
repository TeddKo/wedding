<script lang="ts">
  import { setTheme, theme } from "../../lib/theme.svelte";
  import { THEMES, THEME_NAMES } from "../../lib/themes";

  let opts = $state<HTMLButtonElement[]>([]);

  /** 라디오 그룹 방향키: 좌/상=이전, 우/하=다음. 선택과 포커스가 함께 이동한다 */
  function onkeydown(e: KeyboardEvent) {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = THEME_NAMES.length;
    const i = (THEME_NAMES.indexOf(theme.name) + d + n) % n;
    setTheme(THEME_NAMES[i]);
    opts[i]?.focus();
  }
</script>

<div class="ig-pick" role="radiogroup" aria-label="초대장 분위기 고르기" {onkeydown}>
  {#each THEME_NAMES as k, i (k)}
    <button bind:this={opts[i]} type="button" role="radio" class="ig-opt" data-k={k} aria-checked={theme.name === k} tabindex={theme.name === k ? 0 : -1} onclick={() => setTheme(k)}>
      <span class="ig-sw" aria-hidden="true">
        {#if k === "halloween"}
          <svg viewBox="0 0 20 20" focusable="false"><path d="M5 17V9.5C5 6.2 7.6 3.6 10 2c2.4 1.6 5 4.2 5 7.500V17" /><path d="M8 17V10.5c0-1.400.8-2.600 2-3.500 1.200.9 2 2.100 2 3.500V17" /></svg>
        {:else if k === "puppy"}
          <svg viewBox="0 0 20 20" focusable="false"><rect x="3.500" y="5.500" width="13" height="9" rx="3.500" /><circle class="f" cx="7.500" cy="10" r="1.400" /></svg>
        {:else}
          <svg viewBox="0 0 20 20" focusable="false"><path d="M10 2.500v15" /><circle class="b" cx="10" cy="10" r="3.300" /></svg>
        {/if}
      </span>
      <span class="ig-cap">{THEMES[k].label}</span>
    </button>
  {/each}
</div>

<style>
  .ig-pick { display: flex; gap: 6px; }
  .ig-opt {
    position: relative; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; margin: 0; border: 0; background: none; color: inherit;
    cursor: pointer; -webkit-appearance: none; appearance: none; -webkit-tap-highlight-color: transparent;
  }
  .ig-sw { display: grid; place-items: center; width: 36px; height: 36px; box-sizing: border-box; transition: transform 220ms var(--e-out), box-shadow 220ms var(--e-io), border-color 220ms var(--e-io); }
  .ig-sw svg { width: 20px; height: 20px; display: block; fill: none; stroke: currentColor; stroke-width: 1.200; stroke-linecap: round; stroke-linejoin: round; }
  .ig-sw .f, .ig-sw .b { fill: currentColor; stroke: none; }
  .ig-sw .b { fill: var(--sw-bg); stroke: currentColor; stroke-width: 1.600; }
  .ig-cap { position: absolute; top: calc(100% + 3px); left: 50%; transform: translateX(-50%); white-space: nowrap; font: 500 11px/1 var(--f-ui); letter-spacing: 0.06em; color: var(--ink-2); opacity: 0; transition: opacity 220ms var(--e-io); pointer-events: none; }
  .ig-opt[aria-checked="true"] .ig-cap { opacity: 1; }
  .ig-opt:focus-visible { outline: 2px solid var(--accent); outline-offset: 0; border-radius: 12px; }

  .ig-opt[data-k="halloween"] { --sw-bg: #eee7de; --sw-ink: #8c3f1a; }
  .ig-opt[data-k="puppy"] { --sw-bg: #faf6f1; --sw-ink: #9e5670; }
  .ig-opt[data-k="dev"] { --sw-bg: #f6f6f3; --sw-ink: #34558b; }
  .ig-sw { background: var(--sw-bg); color: var(--sw-ink); }

  @media (prefers-reduced-motion: reduce) {
    .ig-sw, .ig-cap { transition: none; }
  }
</style>
