<script lang="ts">
  import { onMount } from "svelte";
  import { setTheme, theme } from "../lib/theme.svelte";
  import { THEMES, THEME_NAMES } from "../lib/themes";
  import { playBgm } from "../scripts/audio";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  let { groom, bride, date }: { groom: string; bride: string; date: string } = $props();

  let done = $state(false);
  let leaving = $state(false);
  let openBtn = $state<HTMLButtonElement>();

  const leave = (_: Element) => {
    const d = reduced() ? 0 : 600;
    return { duration: d, css: (t: number) => `opacity:${t};transform:translateY(${(1 - t) * -12}px)` };
  };

  onMount(() => {
    const html = document.documentElement;
    /* JS 가 느려 폴백 타이머가 이미 게이트를 걷어냈다면 인트로는 건너뛴다 */
    if (!html.classList.contains("js")) {
      done = true;
      stage.open = true;
      return;
    }
    stage.gate = true;
    html.dataset.gate = "ready";
    for (const el of document.querySelectorAll("main, footer")) el.setAttribute("inert", "");
    openBtn?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  });

  function openGate() {
    if (leaving) return;
    leaving = true;
    playBgm();
    const html = document.documentElement;
    html.classList.remove("gated");
    stage.open = true;
    done = true;
    for (const el of document.querySelectorAll("main, footer")) el.removeAttribute("inert");
    const main = document.querySelector<HTMLElement>("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
  }
</script>

{#if !done}
  <div class="gate" role="dialog" aria-modal="true" aria-label="청첩장 인트로" out:leave>
    <div class="mid">
      <p class="eyebrow">Wedding Invitation</p>
      <p class="names"><span>{groom}</span><span>{bride}</span></p>
      <i class="hair"></i>
      <p class="date">{date}</p>
    </div>
    <div class="bottom">
      <button bind:this={openBtn} type="button" class="open" onclick={openGate}>초대장 열기</button>
      <div class="pick" role="group" aria-label="초대장 분위기 고르기">
        {#each THEME_NAMES as k (k)}
          <button type="button" class="opt" aria-pressed={theme.name === k} onclick={() => setTheme(k)}>{THEMES[k].label}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .gate {
    position: fixed; inset: 0; z-index: 100; display: none; flex-direction: column; align-items: center; justify-content: space-between;
    padding: 0 40px calc(48px + env(safe-area-inset-bottom)); background: var(--paper), var(--bg); color: var(--ink); text-align: center;
  }
  :global(html.js) .gate { display: flex; }
  .mid { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 24px; }
  .eyebrow { font: 400 14px/1.4 var(--f-latin); text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent-text); margin: 0 0 28px; }
  .names { display: flex; flex-direction: column; gap: 0; margin: 0; font: 700 20px/28px var(--f-name); letter-spacing: 0.6em; padding-left: 0.6em; }
  .hair { display: block; width: 1px; height: 48px; margin: 28px 0; background: var(--ink-3); }
  .date { margin: 0; font: 400 15px/1.7 var(--f-name); letter-spacing: 0.05em; color: var(--ink-2); }

  .bottom { display: flex; flex-direction: column; align-items: center; gap: 24px; }
  .open {
    min-height: 48px; padding: 0 36px; border: 1px solid var(--ink); border-radius: 9999px; background: transparent; color: var(--ink);
    font: 500 14.5px/1.4 var(--f-ui); cursor: pointer; -webkit-appearance: none; appearance: none; -webkit-tap-highlight-color: transparent;
    transition: background 0.2s;
  }
  .open:hover { background: var(--surface); }
  .pick { display: inline-flex; gap: 4px; padding: 3px; border-radius: 9999px; background: var(--track); }
  .opt {
    min-height: 30px; padding: 0 14px; border: 0; border-radius: 9999px; background: none; color: var(--ink-3);
    font: 400 12.5px/1 var(--f-ui); cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 0.2s, color 0.2s;
  }
  .opt[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); }
  .opt:focus-visible, .open:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
