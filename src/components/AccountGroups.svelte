<script lang="ts">
  import { onMount } from "svelte";
  import ActionButtons from "./ActionButtons.svelte";
  import type { AccountRow } from "../lib/family";

  let { groups }: { groups: { title: string; rows: AccountRow[] }[] } = $props();

  /* JS 가 없으면 서버 HTML 의 두 그룹이 모두 보이고, 마운트 후 세그먼트 토글로 바뀐다 */
  let mounted = $state(false);
  let sel = $state(0);

  onMount(() => {
    mounted = true;
  });
</script>

{#snippet list(rows: AccountRow[])}
  <ul class="acc-list">
    {#each rows as r}
      <li class="acc-card">
        {#if r.number}
          <div class="acc-main">
            <span class="acc-rel">{r.label}</span>
            <span class="acc-name">{r.holder}</span>
            <span class="acc-num">{r.bank} {r.number}</span>
            {#if r.payLink}
              <a class="pay" href={r.payLink} target="_blank" rel="noopener noreferrer">송금</a>
            {/if}
          </div>
          <span class="acc-copy">
            <ActionButtons actions={[{ kind: "copy", label: "계좌번호 복사", text: `${r.bank} ${r.number}`.trim(), icon: true }]} />
          </span>
        {:else}
          <div class="acc-main">
            <span class="acc-rel">{r.label}</span>
            <span class="acc-name">{r.holder}</span>
            <span class="acc-soon">준비 중</span>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<div class="accs">
  {#if !mounted}
    {#each groups as g}
      <div class="grp">
        <p class="grp-title">{g.title}</p>
        {@render list(g.rows)}
      </div>
    {/each}
  {:else}
    <div class="seg-track seg" role="tablist" aria-label="신랑측 신부측">
      {#each groups as g, i}
        <button type="button" role="tab" id="acc-t{i}" class="seg-btn" class:on={sel === i} aria-selected={sel === i} aria-controls="acc-p" onclick={() => (sel = i)}>{g.title}</button>
      {/each}
    </div>
    <div id="acc-p" role="tabpanel" aria-labelledby="acc-t{sel}">
      {@render list(groups[sel].rows)}
    </div>
  {/if}
</div>

<style>
  .accs { text-align: left; }
  .seg-track { display: flex; width: 220px; height: 40px; padding: 3px; margin: 0 auto 16px; border-radius: 9999px; background: var(--track, var(--line)); box-sizing: border-box; }
  .seg-btn {
    all: unset; box-sizing: border-box; flex: 1; display: flex; align-items: center; justify-content: center; border-radius: 9999px; cursor: pointer;
    font: 400 14px/1 var(--f-ui, inherit); color: var(--ink-3); -webkit-tap-highlight-color: transparent; transition: background-color 0.3s ease, color 0.3s ease;
  }
  .seg-btn.on { background: var(--surface); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgb(26 26 26 / 0.06); }
  .seg-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .grp + .grp { margin-top: 24px; }
  .grp-title { margin: 0 0 8px; font-size: 14px; color: var(--ink-2); text-align: center; }
  .acc-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .acc-card { position: relative; padding: 18px 20px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
  .acc-main { display: grid; justify-items: start; gap: 2px; min-width: 0; padding-right: 36px; }
  .acc-rel { font-size: 12px; line-height: 1.5; color: var(--ink-3); }
  .acc-name { font-size: 15px; font-weight: 600; line-height: 1.5; color: var(--ink); }
  .acc-num { font: 400 14px/1.6 var(--f-ui, inherit); font-variant-numeric: tabular-nums; color: var(--ink-2); overflow-wrap: anywhere; }
  .pay { margin-top: 8px; display: inline-flex; align-items: center; height: 28px; padding: 0 14px; border: 1px solid var(--line); border-radius: 9999px; color: var(--ink); text-decoration: none; font: 400 13px/1 var(--f-ui, inherit); }
  .acc-soon { font-size: 13px; color: var(--ink-3); }
  .acc-copy { position: absolute; top: 12px; right: 12px; }
  .acc-copy :global(.icon-btn) { width: 32px; height: 32px; border: 1px solid var(--line); }
  @media (prefers-reduced-motion: reduce) { .seg-btn { transition: none; } }
</style>
