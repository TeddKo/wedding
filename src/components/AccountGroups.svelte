<script lang="ts">
  import { onMount } from "svelte";
  import ActionButtons from "./ActionButtons.svelte";
  import { ICONS } from "../lib/icons";
  import type { AccountRow } from "../lib/family";

  let { groups }: { groups: { title: string; rows: AccountRow[] }[] } = $props();

  /* JS 가 없으면 서버 HTML 의 <details open> 그대로 열려 있고, 마운트 후 접힌 아코디언으로 바뀐다 */
  let mounted = $state(false);
  let open = $state<boolean[]>([]);

  onMount(() => {
    open = groups.map(() => false);
    mounted = true;
  });
</script>

{#snippet list(rows: AccountRow[])}
  <ul class="acc-list">
    {#each rows as r}
      <li>
        <span class="acc-rel">{r.label}</span>
        {#if r.number}
          <span class="acc-bank">{r.bank} {r.holder}</span>
          <span class="acc-num">{r.number}</span>
          <span class="acc-btns">
            <ActionButtons actions={[{ kind: "copy", label: "복사", text: `${r.bank} ${r.number}`.trim(), ghost: true, small: true }]} />
            {#if r.payLink}
              <a class="btn-text" href={r.payLink} target="_blank" rel="noopener noreferrer">송금</a>
            {/if}
          </span>
        {:else}
          <span class="acc-soon">준비 중</span>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<div class="accs">
  {#if !mounted}
    {#each groups as g}
      <details class="acc" open>
        <summary class="acc-head">{g.title}</summary>
        {@render list(g.rows)}
      </details>
    {/each}
  {:else}
    {#each groups as g, i}
      <div class="acc" class:is-open={open[i]}>
        <button type="button" class="acc-head" aria-expanded={open[i]} aria-controls="acc-p{i}" onclick={() => (open[i] = !open[i])}>
          <span>{g.title}</span>
          <svg class="ico chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICONS["chevron-down"]} /></svg>
        </button>
        <div id="acc-p{i}" class="acc-panel" role="region" inert={!open[i]}>
          <div class="acc-inner">{@render list(g.rows)}</div>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .accs { border-bottom: 1px solid var(--line, rgb(var(--gold-rgb) / 0.3)); }
  .acc { border-top: 1px solid var(--line, rgb(var(--gold-rgb) / 0.3)); }
  .acc-head {
    all: unset; box-sizing: border-box; display: flex; width: 100%; height: 56px; justify-content: space-between; align-items: center;
    cursor: pointer; font-family: inherit; font-size: 16px; font-weight: 600; color: var(--ink, var(--ivory)); list-style: none;
  }
  .acc-head::-webkit-details-marker { display: none; }
  .acc-head:focus-visible { outline: 2px solid var(--accent, var(--pumpkin)); outline-offset: -2px; }
  .chev { color: var(--ink-2, var(--ivory-dim)); transition: transform 200ms ease; }
  .is-open .chev { transform: rotate(180deg); }
  .acc-panel { display: grid; grid-template-rows: 0fr; visibility: hidden; transition: grid-template-rows 200ms ease, visibility 200ms; }
  .is-open .acc-panel { grid-template-rows: 1fr; visibility: visible; }
  .acc-inner { overflow: hidden; min-height: 0; }
  .acc-list { list-style: none; margin: 0; padding: 0 0 8px; }
  .acc-list li { display: grid; grid-template-columns: 1fr auto; column-gap: 12px; align-items: center; padding: 12px 0; }
  .acc-list li + li { border-top: 1px solid var(--line, rgb(var(--gold-rgb) / 0.3)); }
  .acc-rel { grid-column: 1 / -1; font-size: 13px; line-height: 1.5; color: var(--ink-2, var(--ivory-dim)); }
  .acc-bank { grid-column: 1; font-size: 15px; line-height: 1.6; }
  .acc-num { grid-column: 1; font-family: var(--f-mono, ui-monospace, "SF Mono", Menlo, monospace); font-size: 16px; line-height: 1.6; overflow-wrap: anywhere; }
  .acc-btns { grid-column: 2; grid-row: 2 / span 2; display: flex; gap: 12px; align-items: center; }
  .acc-soon { grid-column: 1 / -1; font-size: 14px; color: var(--ink-2, var(--ivory-dim)); }
  @media (prefers-reduced-motion: reduce) { .chev, .acc-panel { transition: none; } }
</style>
