<script lang="ts">
  import { onMount } from "svelte";
  import ActionButtons from "./ActionButtons.svelte";
  import { ICONS } from "../lib/icons";
  import { reduced } from "../lib/motion";
  import type { AccountRow } from "../lib/family";

  let { groups }: { groups: { title: string; rows: AccountRow[] }[] } = $props();

  /* JS 가 없으면 서버 HTML 의 두 그룹이 모두 보이고, 마운트 후 세그먼트 토글로 전환 */
  let mounted = $state(false);
  let sel = $state(0);
  let leaving = $state(false);
  let switched = $state(false);
  let copied = $state("");
  let swapTimer = 0;
  let copyTimer = 0;

  onMount(() => {
    mounted = true;
    return () => {
      clearTimeout(swapTimer);
      clearTimeout(copyTimer);
    };
  });

  /** 나가는 목록 opacity 0(120ms) 뒤 교체, 들어오는 카드는 70ms 스태거 rise */
  function pick(i: number) {
    if (i === sel) return;
    clearTimeout(swapTimer);
    if (reduced()) {
      sel = i;
      return;
    }
    leaving = true;
    swapTimer = window.setTimeout(() => {
      switched = true;
      sel = i;
      leaving = false;
    }, 120);
  }

  function onKey(e: KeyboardEvent) {
    const n = groups.length;
    const next = e.key === "ArrowRight" ? (sel + 1) % n : e.key === "ArrowLeft" ? (sel + n - 1) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    pick(next);
    document.getElementById(`acc-t${next}`)?.focus();
  }

  /** 복사 마이크로 피드백: 클릭한 카드의 아이콘이 check 로 교차 전환, 1.6s 후 복귀 */
  function mark(e: MouseEvent, key: string) {
    if (!(e.target as Element).closest("button")) return;
    copied = key;
    clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => (copied = ""), 1600);
  }
</script>

{#snippet list(rows: AccountRow[], g: number)}
  <ul class="acc-list" class:leaving class:enter={switched}>
    {#each rows as r, i}
      <li class="acc-card" data-rv="rise" style="--d:{780 + i * 70}ms;--e:{i * 70}ms">
        <div class="acc-box" data-press>
          <div class="acc-main">
            <span class="acc-rel">{r.label}</span>
            <span class="acc-name">{r.holder}</span>
            {#if r.number}
              <span class="acc-num">{r.bank} {r.number}</span>
              {#if r.payLink}
                <a class="pay" href={r.payLink} target="_blank" rel="noopener noreferrer">송금</a>
              {/if}
            {/if}
          </div>
          {#if r.number}
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <span class="acc-copy" class:done={copied === `${g}-${i}`} onclick={(e) => mark(e, `${g}-${i}`)}>
              <ActionButtons actions={[{ kind: "copy", label: "계좌번호 복사", text: `${r.bank} ${r.number}`.trim(), icon: true }]} />
              <svg class="chk" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICONS.check} /></svg>
            </span>
          {:else}
            <span class="acc-soon">준비 중</span>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
{/snippet}

<div class="accs">
  {#if !mounted}
    {#each groups as g, gi}
      <div class="grp">
        <p class="grp-title">{g.title}</p>
        {@render list(g.rows, gi)}
      </div>
    {/each}
  {:else}
    <div class="seg-track" role="tablist" aria-label="신랑 측, 신부 측 계좌" style="--n:{groups.length};--i:{sel};--d:700ms" data-rv="rise">
      <i class="thumb" aria-hidden="true"></i>
      {#each groups as g, i}
        <button type="button" role="tab" id="acc-t{i}" class="seg-btn" class:on={sel === i} aria-selected={sel === i} tabindex={sel === i ? 0 : -1} aria-controls="acc-p" onkeydown={onKey} onclick={() => pick(i)}>{g.title}</button>
      {/each}
    </div>
    <div id="acc-p" role="tabpanel" aria-labelledby="acc-t{sel}">
      {#key sel}
        {@render list(groups[sel].rows, sel)}
      {/key}
    </div>
  {/if}
</div>

<style>
  .accs { text-align: left; }
  .seg-track { position: relative; display: flex; width: 220px; height: 40px; padding: 3px; margin: 0 auto 16px; border-radius: 9999px; background: var(--track, var(--line)); box-sizing: border-box; }
  .thumb { position: absolute; left: 3px; top: 3px; bottom: 3px; width: calc((100% - 6px) / var(--n)); border-radius: 9999px; background: var(--surface); box-shadow: 0 1px 2px rgb(26 26 26 / 0.06); transform: translateX(calc(var(--i) * 100%)); transition: transform 360ms var(--e-out); }
  .seg-btn {
    all: unset; position: relative; z-index: 1; box-sizing: border-box; flex: 1; display: flex; align-items: center; justify-content: center; border-radius: 9999px; cursor: pointer;
    font: 400 14px/1 var(--f-ui, inherit); color: var(--ink-3); -webkit-tap-highlight-color: transparent; transition: color 0.3s ease;
  }
  .seg-btn.on { color: var(--ink); font-weight: 600; }
  .seg-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .grp + .grp { margin-top: 24px; }
  .grp-title { margin: 0 0 8px; font-size: 14px; color: var(--ink-2); text-align: center; }
  .acc-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; transition: opacity 120ms linear; }
  .acc-list.leaving { opacity: 0; }
  .acc-list.enter .acc-card { animation: acc-in var(--t3) var(--e-out) var(--e) backwards; }
  @keyframes acc-in { from { opacity: 0; transform: translateY(var(--rv-y)) scale(var(--rv-s)); } }
  .acc-box { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; padding: 12px 14px 12px 20px; border: 1px solid var(--line); border-radius: 12px; background: transparent; box-sizing: border-box; }
  .acc-main { display: grid; justify-items: start; gap: 2px; min-width: 0; }
  .acc-rel { font-size: 12px; line-height: 1.5; color: var(--ink-3); }
  .acc-name { font-size: 15px; font-weight: 600; line-height: 1.5; color: var(--ink); }
  .acc-num { font: 400 14px/1.6 var(--f-ui, inherit); font-variant-numeric: tabular-nums; color: var(--ink-2); overflow-wrap: anywhere; }
  .pay { margin-top: 8px; display: inline-flex; align-items: center; height: 28px; padding: 0 14px; border: 1px solid var(--line); border-radius: 9999px; color: var(--ink); text-decoration: none; font: 400 13px/1 var(--f-ui, inherit); }
  .acc-soon { flex: none; margin-left: auto; padding: 2px 10px; border: 1px solid var(--line); border-radius: 9999px; font-size: 11.5px; line-height: 1.6; color: var(--ink-3); }
  .acc-copy { position: relative; flex: none; display: inline-flex; }
  .acc-copy :global(.icon-btn) { width: 32px; height: 32px; border: 1px solid var(--line); }
  .acc-copy :global(.icon-btn svg) { transition: opacity 240ms var(--e-out), transform 240ms var(--e-out); }
  .chk { position: absolute; inset: 0; margin: auto; width: 18px; height: 18px; fill: none; stroke: var(--accent-text); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; opacity: 0; transform: scale(0.6); transition: opacity 240ms var(--e-out), transform 240ms var(--e-out); pointer-events: none; }
  .acc-copy.done :global(.icon-btn svg) { opacity: 0; transform: scale(0.6); }
  .acc-copy.done .chk { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) {
    .thumb, .seg-btn, .acc-list, .acc-copy :global(.icon-btn svg), .chk { transition: none; }
    .acc-list.enter .acc-card { animation: none; }
  }
</style>
