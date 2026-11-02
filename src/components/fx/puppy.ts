import { createFall, svgToImage } from "../../lib/fx/fall";
import { pawSvg } from "../../lib/fx/sprites-paw";

const EASE_RUN = "cubic-bezier(.22,.8,.3,1)";
const STEP_PX = 160;
const MAX_STAMPS = 8;
const STAMP_MS = 200;
const HOLD_MS = 3000;
const FADE_MS = 1000;
const SIT_AT = 1950;
const SIT_FADE = 250;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 달리는 동안 bob(|sin| 6px, 주기 260ms)·기울기(±2.5°). 감속 구간 진폭 → 0 */
function bobFrames(dur: number): Keyframe[] {
  const out: Keyframe[] = [];
  const n = Math.round(dur / 20);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const amp = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45) ** 1.5;
    const ms = t * dur;
    const bob = Math.abs(Math.sin((ms / 260) * Math.PI)) * 6 * amp;
    const tilt = Math.sin((ms / 260) * Math.PI * 2) * 2.5 * amp;
    out.push({ offset: t, transform: `translateY(${-bob.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)` });
  }
  return out;
}

/** 뛰어와서 앉기: 공 → 네눈박이 → 말티즈 → 크로스페이드 */
function runIn(root: HTMLElement, anims: Animation[]): void {
  const sit = root.querySelector<HTMLElement>(".pc-sit");
  const k = root.querySelector<HTMLElement>('[data-run="k"]');
  const m = root.querySelector<HTMLElement>('[data-run="m"]');
  const ball = root.querySelector<HTMLElement>('[data-run="ball"]');
  if (!sit || !k || !m || !ball) return;
  const add = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => anims.push(el.animate(kf, o));

  const place = (el: HTMLElement, delay: number, dur: number) => {
    const from = -(el.offsetLeft + el.offsetWidth + 10);
    add(el, [{ transform: `translateX(${from}px)` }, { transform: "translateX(0)" }], { duration: dur, delay, easing: EASE_RUN, fill: "both" });
    const inner = el.firstElementChild;
    if (inner) add(inner, bobFrames(dur), { duration: dur, delay, easing: "linear", fill: "both" });
    add(el, [{ opacity: 1 }, { opacity: 1, offset: (SIT_AT - delay) / (SIT_AT + SIT_FADE - delay) }, { opacity: 0 }], { duration: SIT_AT + SIT_FADE - delay, delay, fill: "both", composite: "replace" });
  };
  place(k, 200, 1500);
  place(m, 450, 1500);

  const bx = -(ball.offsetLeft + ball.offsetWidth + 10);
  add(ball, [{ opacity: 1, transform: `translateX(${bx}px)`, easing: "cubic-bezier(.2,.7,.3,1)" }, { opacity: 1, transform: "translateX(0)", offset: 1600 / 2000, easing: "ease-out" }, { opacity: 1, transform: "translateX(0)" }], { duration: 2000, fill: "both" });
  const bi = ball.firstElementChild;
  if (bi) {
    add(bi, [
      { transform: "translateY(0) rotate(0deg)", easing: "cubic-bezier(.2,.7,.3,1)", offset: 0 },
      { transform: "translateY(0) rotate(720deg)", offset: 1600 / 2000, easing: "ease-out" },
      { transform: "translateY(-8px) rotate(720deg)", offset: 1720 / 2000, easing: "ease-in" },
      { transform: "translateY(0) rotate(720deg)", offset: 1840 / 2000 },
      { transform: "translateY(-4px) rotate(720deg)", offset: 1920 / 2000, easing: "ease-in" },
      { transform: "translateY(0) rotate(720deg)", offset: 1 },
    ], { duration: 2000, fill: "both" });
  }

  add(sit, [{ opacity: 0 }, { opacity: 0, offset: SIT_AT / (SIT_AT + SIT_FADE) }, { opacity: 1 }], { duration: SIT_AT + SIT_FADE, easing: "linear", fill: "both" });
}

/** Orn: 5개 발자국 + 뼈다귀를 보이면 120ms 간격으로 순차 스탬프 */
function armOrns(anims: Animation[], cleanups: Array<() => void>): void {
  const orns = [...document.querySelectorAll<SVGElement>(".pup-orn")];
  if (!orns.length || typeof IntersectionObserver === "undefined") return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target as SVGElement;
      if (!e.isIntersecting && e.boundingClientRect.bottom > 0) continue;
      io.unobserve(el);
      if (e.isIntersecting) {
        el.querySelectorAll(".pp").forEach((p, i) => {
          anims.push(p.animate([{ opacity: 0, transform: "scale(1.25)" }, { opacity: 0.5, transform: "scale(1)" }], { duration: 200, delay: i * 120, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" }));
        });
      }
      el.querySelectorAll<SVGElement>(".pp").forEach((p) => p.style.removeProperty("visibility"));
    }
  }, { threshold: 0.6 });
  for (const el of orns) {
    el.querySelectorAll<SVGElement>(".pp").forEach((p) => p.style.setProperty("visibility", "hidden"));
    io.observe(el);
  }
  cleanups.push(() => {
    io.disconnect();
    for (const el of orns) {
      el.querySelectorAll<SVGElement>(".pp").forEach((p) => p.style.removeProperty("visibility"));
    }
  });
}

/** 엔딩 피날레: 진입 시 발자국 5개가 좌→우로 엔딩 아트까지 140ms 간격으로 찍히고 개들이 엎드려 내려앉는다(1회) */
function endingPaws(anims: Animation[], cleanups: Array<() => void>): void {
  const foot = document.querySelector<HTMLElement>("footer.ending");
  const art = foot?.querySelector<HTMLElement>(".end-art");
  if (!foot || !art || typeof IntersectionObserver === "undefined") return;
  const timers: number[] = [];
  let layer: HTMLElement | null = null;
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const fr = foot.getBoundingClientRect();
      const ar = art.getBoundingClientRect();
      const size = 14;
      const svg = pawSvg("#b27085").replace('width="48" height="48"', 'width="100%" height="100%"');
      const box = document.createElement("div");
      box.setAttribute("aria-hidden", "true");
      box.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
      layer = box;
      const x0 = 36;
      const x1 = Math.max(x0 + 40, ar.left - fr.left - size - 6);
      const y = ar.top - fr.top + ar.height * 0.55;
      for (let i = 0; i < 5; i++) {
        const el = document.createElement("span");
        el.innerHTML = svg;
        const x = x0 + ((x1 - x0) * i) / 4;
        const dy = i % 2 ? 6 : -6;
        el.style.cssText = `position:absolute;left:${x}px;top:${y + dy - size / 2}px;width:${size}px;height:${size}px;opacity:.38;transform:rotate(90deg)`;
        box.appendChild(el);
        anims.push(
          el.animate(
            [
              { opacity: 0, transform: "rotate(90deg) scale(1.3)" },
              { opacity: 0.38, transform: "rotate(90deg) scale(1)" },
            ],
            { duration: 220, delay: i * 140, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" },
          ),
        );
      }
      foot.appendChild(box);
      timers.push(
        window.setTimeout(() => {
          art.querySelectorAll<SVGElement>(".orn-dogs-rest .b, .orn-dogs-rest .m").forEach((g, i) => {
            anims.push(g.animate([{ transform: "translateY(-5px)" }, { transform: "translateY(0)" }], { duration: 420, delay: i * 90, easing: "cubic-bezier(.34,1.56,.64,1)" }));
          });
        }, 5 * 140 + 120),
      );
    },
    { threshold: 0.4 },
  );
  io.observe(foot);
  cleanups.push(() => {
    io.disconnect();
    timers.forEach(clearTimeout);
    layer?.remove();
  });
}

/** 스크롤 발자국: |dy| 160px 누적마다 뷰포트 62% 높이 거터에 1개. 최대 8, passive + rAF 스로틀, 유휴 rAF 없음 */
function pawTrail(cleanups: Array<() => void>): void {
  const page = document.querySelector<HTMLElement>(".page");
  if (!page) return;
  const layer = document.createElement("div");
  layer.className = "fx-pawtrail";
  layer.setAttribute("aria-hidden", "true");
  page.prepend(layer);

  const svg = pawSvg("#b27085").replace('width="48" height="48"', 'width="100%" height="100%"');
  const live: Array<{ el: HTMLElement; an: Animation }> = [];
  let lastY = scrollY;
  let acc = 0;
  let n = 0;
  let raf = 0;

  const stamp = () => {
    const rect = page.getBoundingClientRect();
    const pad = rect.width <= 360 ? 28 : 40;
    const size = 12;
    const lo = 10;
    const hi = Math.max(lo + 2, Math.min(22, pad - size - 4));
    const side = Math.floor(n / 6) % 2;
    const foot = n % 2 ? hi : lo;
    const left = side ? rect.width - foot - size : foot;
    const top = innerHeight * 0.62 - rect.top;
    const el = document.createElement("span");
    el.className = "pw";
    el.innerHTML = svg;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    const rot = 180 + rand(-10, 10);
    layer.appendChild(el);
    n++;
    const total = STAMP_MS + HOLD_MS + FADE_MS;
    const r = `rotate(${rot}deg)`;
    const an = el.animate(
      [
        { opacity: 0, transform: `${r} scale(1.25)` },
        { opacity: 0.22, transform: `${r} scale(1)`, offset: STAMP_MS / total },
        { opacity: 0.22, transform: `${r} scale(1)`, offset: (STAMP_MS + HOLD_MS) / total },
        { opacity: 0, transform: `${r} scale(1)` },
      ],
      { duration: total, fill: "forwards" },
    );
    const item = { el, an };
    live.push(item);
    an.onfinish = () => {
      el.remove();
      const i = live.indexOf(item);
      if (i >= 0) live.splice(i, 1);
    };
    while (live.length > MAX_STAMPS) {
      const old = live.shift();
      old?.an.cancel();
      old?.el.remove();
    }
  };

  const frame = () => {
    raf = 0;
    const y = scrollY;
    acc += Math.abs(y - lastY);
    lastY = y;
    let guard = 2;
    while (acc >= STEP_PX && guard-- > 0) {
      acc -= STEP_PX;
      stamp();
    }
    if (acc >= STEP_PX) acc = 0;
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  addEventListener("scroll", onScroll, { passive: true });
  cleanups.push(() => {
    removeEventListener("scroll", onScroll);
    if (raf) cancelAnimationFrame(raf);
    for (const { an } of live) an.cancel();
    live.length = 0;
    layer.remove();
  });
}

/**
 * puppy 테마 연출 모듈. Fx.svelte 가 오픈/테마 전환 시 호출한다.
 * @param ctx first=true 면 시그니처 연출 1회 재생 시점
 * @returns 정리 함수(타이머/캔버스/리스너/애니메이션 해제)
 */
export function start(ctx: { first: boolean }): () => void {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const anims: Animation[] = [];
  const cleanups: Array<() => void> = [];
  let dead = false;
  let fall: ReturnType<typeof createFall> | null = null;

  armOrns(anims, cleanups);
  pawTrail(cleanups);
  endingPaws(anims, cleanups);

  if (ctx.first) {
    const root = document.querySelector<HTMLElement>(".cover-dogs .pc");
    if (root) runIn(root, anims);
    svgToImage(pawSvg())
      .then((img) => {
        if (dead) return;
        fall = createFall({ sprites: [img], gravity: 260, drag: 0, sway: { amp: 18, hz: 1.2 }, spin: [20, 60], size: [12, 18], alphaTail: 0.3, alpha: 0.55 });
        fall.burst(8);
      })
      .catch(() => {});
  }

  return () => {
    dead = true;
    fall?.destroy();
    for (const a of anims) a.cancel();
    for (const c of cleanups) c();
  };
}
