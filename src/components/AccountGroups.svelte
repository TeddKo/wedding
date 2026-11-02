<script lang="ts">
  import { onMount } from "svelte";
  import { Spring } from "svelte/motion";
  import ActionButtons from "./ActionButtons.svelte";
  import { reduced } from "../lib/motion";
  import type { AccountRow } from "../lib/family";

  let { groups }: { groups: { title: string; rows: AccountRow[] }[] } = $props();

  /* JS 가 없으면 서버 HTML 의 <details open> 그대로 열려 있고, 마운트 후 접힌 아코디언으로 바뀐다 */
  let mounted = $state(false);
  let open = $state<boolean[]>([]);
  let busy = $state<boolean[]>([]);
  let panels: HTMLElement[] = [];
  const h = groups.map(() => new Spring(0, { stiffness: 0.14, damping: 0.6 }));

  onMount(() => {
    open = groups.map(() => false);
    busy = groups.map(() => false);
    mounted = true;
  });

  async function toggle(i: number) {
    open[i] = !open[i];
    busy[i] = true;
    const to = open[i] ? panels[i].scrollHeight : 0;
    await h[i].set(to, reduced() ? { instant: true } : undefined);
    if (open[i] === (to > 0)) busy[i] = false;
  }
</script>

{#snippet list(rows: AccountRow[])}
  <ul class="acc-list">
    {#each rows as r}
      <li>
        <span class="acc-label">{r.label}</span>
        {#if r.number}
          <span class="acc-num">{r.bank} {r.number}</span>
          <span class="acc-holder">{r.holder}</span>
          <span class="acc-btns">
            <ActionButtons actions={[{ kind: "copy", label: "복사", text: `${r.bank} ${r.number}`.trim(), ghost: true, small: true }]} />
            {#if r.payLink}
              <a class="btn btn-ghost btn-sm" href={r.payLink} target="_blank" rel="noopener noreferrer">송금</a>
            {/if}
          </span>
        {:else}
          <span class="acc-soon">준비 중</span>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{#if !mounted}
  {#each groups as g}
    <details class="acc" open>
      <summary>{g.title}</summary>
      {@render list(g.rows)}
    </details>
  {/each}
{:else}
  {#each groups as g, i}
    <div class="acc" class:is-open={open[i]}>
      <button type="button" class="acc-head" aria-expanded={open[i]} aria-controls="acc-p{i}" onclick={() => toggle(i)}>
        <span>{g.title}</span>
        <svg class="chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>
      </button>
      <div
        id="acc-p{i}"
        class="acc-panel"
        role="region"
        bind:this={panels[i]}
        inert={!open[i]}
        style:height={busy[i] ? `${Math.max(0, h[i].current)}px` : open[i] ? "auto" : "0px"}
        style:visibility={open[i] || busy[i] ? "visible" : "hidden"}
      >
        {@render list(g.rows)}
      </div>
    </div>
  {/each}
{/if}

<style>
  .acc-panel { overflow: hidden; }
  .acc-head {
    all: unset; box-sizing: border-box; display: flex; width: 100%; justify-content: space-between; align-items: center;
    padding: 14px 18px; cursor: pointer; font-family: inherit;
  }
  .acc-head:focus-visible { outline: 2px solid var(--pumpkin); outline-offset: -2px; }
  .chev { color: var(--gold); transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1); }
  .is-open .chev { transform: rotate(180deg); }
  @media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
</style>
