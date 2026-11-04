import type { EntryCtx } from "./entry";

const OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const IO = "cubic-bezier(0.65, 0, 0.35, 1)";
const CMD = "git checkout -b wedding".length;

/**
 * dev 진입: 프롬프트 타이핑 → 출력 → 브랜치 선 → 위로 와이프(스캔라인).
 * 합성 가능한 속성(opacity/transform/clip-path)만 WAAPI 로 구동.
 */
export default async function run({ gate }: EntryCtx): Promise<void> {
  const q = (s: string) => gate.querySelector<HTMLElement>(s);
  const go = (el: Element | null, keyframes: Keyframe[], o: KeyframeAnimationOptions) => {
    if (!el) return Promise.resolve();
    const a = el.animate(keyframes, { fill: "both", ...o });
    const ms = Number(o.delay ?? 0) + Number(o.duration ?? 0) + 50;
    return Promise.race([a.finished, new Promise((r) => setTimeout(r, ms))]);
  };
  const typing = `steps(${CMD}, end)`;
  const show = (el: Element | null, delay: number, duration = 1) => go(el, [{ opacity: 0 }, { opacity: 1 }], { delay, duration, easing: "linear" });

  await Promise.all([
    show(q(".ig-term"), 100),
    go(q(".tm-cmd"), [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { delay: 100, duration: 600, easing: typing }),
    go(q(".tm-cur"), [{ transform: "translateX(0)" }, { transform: `translateX(${CMD}ch)` }], { delay: 100, duration: 600, easing: typing }),
    go(q(".tm-cur"), [{ opacity: 1 }, { opacity: 0 }], { delay: 720, duration: 1 }),
    show(q(".tm-out"), 720, 140),
    show(q(".tm-node"), 860, 120),
    go(q(".tm-line"), [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { delay: 860, duration: 440, easing: OUT }),
    show(q(".ig-scan"), 1000),
    go(q(".ig-scan"), [{ transform: "translateY(calc(100cqh - 1px))" }, { transform: "translateY(-1px)" }], { delay: 1000, duration: 500, easing: IO }),
    go(gate, [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }], { delay: 1000, duration: 500, easing: IO }),
  ]);
}
