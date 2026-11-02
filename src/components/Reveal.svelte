<script lang="ts">
  import { onMount } from "svelte";
  import { Tween } from "svelte/motion";
  import { cubicInOut, cubicOut } from "svelte/easing";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  /* 섹션마다 다른 등장 효과. 효과는 [data-reveal="wipe|blur|rise|line"] 로 고른다.
     line 은 섹션 자체는 그대로 두고 금색 구분선만 그린다(자체 연출이 있는 섬용). */
  function apply(el: HTMLElement, mode: string, p: number) {
    const s = el.style;
    if (mode === "wipe") {
      s.clipPath = `inset(0 ${Math.min(99, (1 - p) * 100)}% 0 0)`;
      s.opacity = String(Math.min(1, p * 3));
    } else if (mode === "blur") {
      s.filter = `blur(${(1 - p) * 10}px)`;
      s.opacity = String(p);
      s.transform = `scale(${1.04 - p * 0.04})`;
    } else if (mode === "rise") {
      s.opacity = String(Math.min(1, p * 1.6));
      s.transform = `translate3d(0, ${(1 - p) * 40}px, 0)`;
    }
  }
  const clear = (el: HTMLElement) => ["clip-path", "opacity", "filter", "transform", "will-change"].forEach((k) => el.style.removeProperty(k));

  onMount(() => {
    if (reduced() || !("IntersectionObserver" in window)) return;
    const queue = new Set<() => void>();
    const stops: (() => void)[] = [];

    function prep(el: HTMLElement) {
      const mode = el.dataset.reveal ?? "rise";
      const body = new Tween(0, { duration: mode === "wipe" ? 1300 : 1100, easing: cubicOut });
      const line = new Tween(0, { duration: 1500, easing: cubicInOut });
      const paths = [...el.querySelectorAll<SVGPathElement>(".orn-divider path")];
      const dividers = paths.filter((p) => p.hasAttribute("pathLength"));
      const diamonds = paths.filter((p) => !p.hasAttribute("pathLength"));
      if (mode !== "line") el.style.willChange = "transform, opacity";
      for (const d of dividers) d.style.strokeDasharray = "1";
      const stop = $effect.root(() => {
        $effect(() => {
          apply(el, mode, body.current);
          for (const d of dividers) d.style.strokeDashoffset = String(1 - line.current);
          for (const d of diamonds) d.style.opacity = String(line.current);
        });
      });
      stops.push(stop);
      return () => {
        void body.set(1);
        void line.set(1, { delay: 350 }).then(() => {
          stop();
          clear(el);
          for (const d of dividers) {
            d.style.removeProperty("stroke-dasharray");
            d.style.removeProperty("stroke-dashoffset");
          }
          for (const d of diamonds) d.style.removeProperty("opacity");
        });
      };
    }

    const plays = new Map<Element, () => void>();
    const onSee = (es: IntersectionObserverEntry[]) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        ioWipe.unobserve(e.target);
        const play = plays.get(e.target)!;
        if (stage.open) play();
        else queue.add(play);
      }
    };
    const io = new IntersectionObserver(onSee, { threshold: 0.12 });
    /* Chrome 은 교차 면적에 clip-path 를 반영한다. wipe 는 처음에 99% 가 잘려 있으므로 임계값을 그만큼 낮춘다 */
    const ioWipe = new IntersectionObserver(onSee, { threshold: 0.004 });
    for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
      plays.set(el, prep(el));
      (el.dataset.reveal === "wipe" ? ioWipe : io).observe(el);
    }
    const watch = $effect.root(() => {
      $effect(() => {
        if (stage.open) {
          queue.forEach((f) => f());
          queue.clear();
        }
      });
    });
    return () => {
      io.disconnect();
      ioWipe.disconnect();
      watch();
      stops.forEach((f) => f());
    };
  });
</script>
