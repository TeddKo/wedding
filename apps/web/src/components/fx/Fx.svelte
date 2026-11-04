<script lang="ts">
  import { onMount } from "svelte";
  import { stage } from "../../lib/stage.svelte";
  import { theme } from "../../lib/theme.svelte";
  import type { ThemeName } from "../../lib/themes";

  /**
   * 테마별 연출 모듈 계약: `export function start(ctx:{first:boolean}): () => void`.
   * first=true 는 오픈 직후/테마 전환 직후 시그니처 1회 재생. 반환 함수는 정리(stop).
   */
  type Mod = { start: (ctx: { first: boolean }) => () => void };
  const MODS: Record<ThemeName, () => Promise<Mod>> = {
    halloween: () => import("./halloween"),
    puppy: () => import("./puppy"),
    dev: () => import("./dev"),
  };

  let stop: (() => void) | null = null;
  let seq = 0;
  let timer = 0;
  let opened = false;

  async function run(name: ThemeName) {
    stop?.();
    stop = null;
    const my = ++seq;
    const mod = await MODS[name]();
    if (my !== seq) return;
    stop = mod.start({ first: true });
  }

  onMount(() => {
    const dispose = $effect.root(() => {
      $effect(() => {
        const name = theme.name;
        const open = stage.open;
        if (!open) return;
        if (!opened) {
          opened = true;
          clearTimeout(timer);
          timer = window.setTimeout(() => run(name), 450);
        } else {
          clearTimeout(timer);
          run(name);
        }
      });
    });
    return () => {
      dispose();
      clearTimeout(timer);
      seq++;
      stop?.();
    };
  });
</script>
