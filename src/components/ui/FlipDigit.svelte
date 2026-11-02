<script lang="ts">
  import { Tween } from "svelte/motion";
  import { cubicIn } from "svelte/easing";
  import { reduced } from "../../lib/motion";

  let { value, steps = 7, delay = 0, go }: { value: number; steps?: number; delay?: number; go: boolean } = $props();

  const quick = reduced();
  let cur = $state(quick ? value : (value + 10 - (steps % 10)) % 10);
  let nxt = $state(cur);
  const ang = new Tween(0, { duration: 130, easing: cubicIn });
  let started = false;

  $effect(() => {
    if (!go || started) return;
    started = true;
    void (async () => {
      await new Promise((r) => setTimeout(r, delay));
      while (cur !== value) {
        nxt = (cur + 1) % 10;
        await ang.set(1);
        cur = nxt;
        ang.set(0, { duration: 0 });
      }
    })();
  });
</script>

<span class="card flip-digit" data-v={cur} aria-hidden="true">
  <span class="half top"><b>{nxt}</b></span>
  <span class="half bottom"><b>{cur}</b></span>
  <span class="flap" style:transform="rotateX({-ang.current * 180}deg)">
    <span class="face front"><b>{cur}</b></span>
    <span class="face back"><b>{nxt}</b></span>
  </span>
</span>

<style>
  .card { position: relative; display: inline-block; width: 42px; height: 62px; perspective: 400px; font: 600 42px/62px var(--latin); color: var(--digit); margin: 0 2px; vertical-align: middle; }
  .half, .face {
    position: absolute; left: 0; right: 0; height: 50%; overflow: hidden; border: 1px solid rgb(var(--gold-rgb) / 0.45);
    background: linear-gradient(var(--panel-a), var(--panel-b));
  }
  .top, .front { top: 0; border-radius: 6px 6px 0 0; border-bottom-width: 0; }
  .bottom, .back { bottom: 0; border-radius: 0 0 6px 6px; border-top-width: 0; background: linear-gradient(var(--panel-b), var(--panel-b)); }
  b { position: absolute; left: 0; right: 0; height: 200%; font-weight: inherit; text-align: center; display: block; }
  .top b, .front b { top: 0; }
  .bottom b, .back b { bottom: 0; }
  .flap { position: absolute; left: 0; right: 0; top: 0; height: 50%; transform-origin: 50% 100%; transform-style: preserve-3d; will-change: transform; }
  .face { backface-visibility: hidden; -webkit-backface-visibility: hidden; height: 100%; }
  .back { transform: rotateX(180deg); top: 0; bottom: auto; border-radius: 0 0 6px 6px; border-top-width: 1px; }
  .card::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgb(var(--shade-rgb) / var(--flip-line, 0.7)); z-index: 3; }
</style>
