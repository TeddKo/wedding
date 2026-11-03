import { createFall, svgToImage, type Fall } from "../../lib/fx/fall";
import { CANDIES, FLECKS } from "../../lib/fx/sprites-candy";

/**
 * halloween 테마 연출 모듈. Fx.svelte 가 오픈/테마 전환 시 호출한다.
 * 오픈 버스트, 호박·사탕 바구니 탭, 촛불 끄기/켜기, 엔딩 유령 인사·도망, 섹션 장난감 탭, 무한 장식 오프스크린 일시정지를 DOM 조회로 연결한다.
 * @param ctx first=true 면 시그니처 연출 1회 재생 시점
 * @returns 정리 함수(타이머/캔버스/리스너 해제)
 */
export function start(ctx: { first: boolean }): () => void {
  let dead = false;
  const undo: (() => void)[] = [];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);

  /* 무한 장식(.hw-float, .hw-idle)은 화면 밖이면 일시정지 */
  if ("IntersectionObserver" in window) {
    const els = document.querySelectorAll<HTMLElement>(".hw-float, .hw-idle");
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("fx-paused", !e.isIntersecting)));
    els.forEach((el) => io.observe(el));
    undo.push(() => {
      io.disconnect();
      els.forEach((el) => el.classList.remove("fx-paused"));
    });
  }

  const wave = () => {
    const arm = q<SVGElement>(".hw-end [id=arm]");
    const target = arm ?? q(".hw-end svg");
    if (!target) return;
    const a = arm ? 12 : 2.5;
    if (arm) {
      arm.style.transformBox = "fill-box";
      arm.style.transformOrigin = "0% 100%";
    }
    const an = target.animate(
      [0, -a, a, -a, a, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
      { duration: 1400, iterations: 2, easing: "ease-in-out" },
    );
    undo.push(() => an.cancel());
  };

  /* 상단 촛불: 탭할 때마다 꺼짐(연기)/켜짐(재점화) 토글 */
  const candle = q<HTMLButtonElement>("[data-candle]");
  if (candle) {
    const onCandle = () => {
      const off = !candle.classList.contains("out");
      candle.classList.toggle("out", off);
      candle.classList.toggle("lit", !off);
      candle.setAttribute("aria-pressed", String(off));
      candle.setAttribute("aria-label", off ? "촛불 켜기" : "촛불 끄기");
    };
    candle.addEventListener("click", onCandle);
    undo.push(() => {
      candle.removeEventListener("click", onCandle);
      candle.classList.remove("out", "lit");
      candle.setAttribute("aria-pressed", "false");
      candle.setAttribute("aria-label", "촛불 끄기");
    });
  }

  /* 엔딩 유령: 탭하면 다시 인사. 4초 안에 5번 넘게 누르면 놀라서 도망갔다가 잠시 뒤 슬그머니 돌아온다 */
  const endGhost = q<HTMLButtonElement>(".hw-end");
  const endBody = q(".hw-end-body");
  if (endGhost && endBody) {
    const HI = ["안녕하세요!", "또 오셨네요?", "Boo!", "반가워요 👋", "결혼식에서 만나요!"];
    let taps: number[] = [];
    let fled = false;
    let n = 0;
    const timers: number[] = [];
    const say = (text: string) => {
      endGhost.parentElement?.querySelectorAll(".hw-say").forEach((o) => o.remove());
      const b = document.createElement("span");
      b.className = "hw-say";
      b.textContent = text;
      b.setAttribute("aria-hidden", "true");
      endGhost.parentElement?.append(b);
      b.addEventListener("animationend", () => b.remove(), { once: true });
    };
    const onGhost = () => {
      if (fled) return;
      const now = performance.now();
      taps = taps.filter((t) => now - t < 4000).concat(now);
      if (taps.length > 5) {
        fled = true;
        taps = [];
        say("으악! 그만 눌러요!");
        endBody.animate(
          [
            { transform: "none", opacity: 1 },
            { transform: "translate(-6px, -4px) rotate(-8deg)", opacity: 1, offset: 0.2 },
            { transform: "translate(160px, -60px) rotate(24deg) scale(0.6)", opacity: 0 },
          ],
          { duration: reduced ? 1 : 700, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" },
        );
        timers.push(
          window.setTimeout(() => {
            if (dead) return;
            endBody.getAnimations().forEach((a) => a.cancel());
            const back = endBody.animate(
              [
                { transform: "translate(-120px, 10px) scale(0.8)", opacity: 0 },
                { transform: "translate(-12px, 0) rotate(-6deg)", opacity: 0.9, offset: 0.7 },
                { transform: "none", opacity: 1 },
              ],
              { duration: reduced ? 1 : 900, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
            );
            back.onfinish = () => {
              fled = false;
              say("…다시 왔어요");
              wave();
            };
          }, 2600),
        );
        return;
      }
      say(HI[n++ % HI.length]);
      wave();
      endBody.animate([{ transform: "none" }, { transform: "translateY(-10px)" }, { transform: "none" }], { duration: reduced ? 1 : 420, easing: "ease-out" });
    };
    endGhost.addEventListener("click", onGhost);
    undo.push(() => {
      endGhost.removeEventListener("click", onGhost);
      timers.forEach(clearTimeout);
      endBody.getAnimations().forEach((a) => a.cancel());
    });
  }

  /* 사탕 바구니: 탭하면 들썩이고 사탕이 튀어오른다(사탕은 아래 fall 준비 후 연결). 모션 감소면 깜빡임만 */
  const timers: number[] = [];
  const basket = q<HTMLButtonElement>(".hw-basket");
  const jiggle = () =>
    reduced
      ? (basket?.firstElementChild as HTMLElement | null)?.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], 320)
      : basket?.animate([0, -9, 7, -4, 0].map((d, i) => ({ transform: `rotate(${d}deg) scale(${i === 1 ? 0.94 : 1})` })), { duration: 520, easing: "ease-out" });
  if (basket) {
    basket.addEventListener("click", jiggle);
    undo.push(() => basket.removeEventListener("click", jiggle));
  }

  if (!reduced) {
    Promise.all([Promise.all(FLECKS.map(svgToImage)), Promise.all(CANDIES.map(svgToImage))])
      .then(([sprites, candies]) => {
        if (dead) return;
        const fall: Fall = createFall({
          sprites,
          gravity: 110,
          drag: 0.03,
          sway: { amp: 14, hz: 0.35 },
          spin: [10, 70],
          size: [7, 13],
          alphaTail: 0.45,
          alpha: 0.85,
        });
        undo.push(() => fall.destroy());

        if (ctx.first) fall.burst(7, { y: [-80, 160] });

        const pk = q(".hw-pumpkin");
        if (pk) {
          let last = 0;
          const onTap = () => {
            const now = performance.now();
            if (now - last < 1200) return;
            last = now;
            const r = pk.getBoundingClientRect();
            fall.spawnAt(r.left + r.width / 2, r.top + r.height * 0.6, 5, { vy: -140, spreadX: 50, spreadY: 40 });
            pk.animate([{ transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 140, easing: "ease-out" });
          };
          pk.addEventListener("pointerdown", onTap);
          undo.push(() => pk.removeEventListener("pointerdown", onTap));
        }

        if (basket) {
          let last = 0;
          const CANDY = { sprites: candies, size: [22, 30] as [number, number], gravity: 1150, drag: 0.004, sway: { amp: 0, hz: 0 }, spin: [160, 420] as [number, number], alpha: 1, alphaTail: 0.35, life: 1.35 };
          const onBasket = () => {
            const now = performance.now();
            if (now - last < 450) return;
            last = now;
            const r = basket.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height * 0.5;
            [0, 90, 180].forEach((d) => timers.push(window.setTimeout(() => !dead && fall.spawnAt(x, y, 2, { vx: -80, vy: -620, spreadX: 110, spreadY: 90, kind: CANDY }), d)));
          };
          basket.addEventListener("click", onBasket);
          undo.push(() => basket.removeEventListener("click", onBasket));
        }

        const end = q("footer.ending");
        if (end && "IntersectionObserver" in window) {
          const io = new IntersectionObserver(
            ([e]) => {
              if (!e.isIntersecting) return;
              io.disconnect();
              fall.burst(3, { y: [-40, 120] });
              wave();
            },
            { threshold: 0.4 },
          );
          io.observe(end);
          undo.push(() => io.disconnect());
        }
      })
      .catch(() => {});
  }

  /* 섹션 장식: 탭 1회=연출 1회, 연출 중 탭 무시. 각 연출은 점유 ms 를 반환. 모션 감소면 불투명도 깜빡임만 */
  const Y: [number, number, string][] = [[0, 0, "cubic-bezier(.5,0,.75,0)"], [0.14, 30, "cubic-bezier(.2,.7,.3,1)"], [0.24, 21, "cubic-bezier(.5,0,.75,0)"], [0.32, 30, "ease-out"], [0.38, 27, "linear"], [0.58, 27, "ease-in-out"], [0.68, 18, "linear"], [0.74, 18, "ease-in-out"], [0.84, 9, "linear"], [0.9, 9, "ease-in-out"], [1, 0, "linear"]];
  const spider = (el: HTMLElement) => {
    el.querySelector(".hw-drop")!.animate(Y.map(([offset, y, easing]) => ({ offset, easing, transform: `translateY(${y}px)` })), 2000);
    el.querySelector(".hw-silk")!.animate(Y.map(([offset, y, easing]) => ({ offset, easing, transform: `scaleY(${(42 + y) / 42})` })), 2000);
    return 2000;
  };
  const cat = (el: HTMLElement) => {
    el.querySelector(".hw-cat-art")!.animate([{ transform: "none", easing: "cubic-bezier(.5,0,.75,0)" }, { transform: "translateY(78%)", offset: 0.15 }, { transform: "translateY(78%)", offset: 0.5, easing: "cubic-bezier(.34,1.56,.64,1)" }, { transform: "none", offset: 0.72 }, { transform: "none" }], 1500);
    el.querySelector(".hw-cat-tail")!.animate([0, 22, -12, 8, 0].map((d) => ({ transform: `rotate(${d}deg)` })), { duration: 800, delay: 1000, easing: "ease-in-out" });
    el.querySelector(".hw-cat-eyes")!.animate([1, 0.1, 1, 0.1, 1].map((s) => ({ transform: `scaleY(${s})` })), { duration: 360, delay: 1080 });
    return 1800;
  };
  const bat = (el: HTMLElement) => {
    const $ = (s: string) => el.querySelector(s)!;
    $(".hw-bat-hang").animate([{ offset: 0, opacity: 1, transform: "rotate(0)" }, { offset: 0.03, transform: "rotate(-10deg)" }, { offset: 0.06, transform: "rotate(8deg)" }, { offset: 0.077, opacity: 1 }, { offset: 0.08, transform: "rotate(0)" }, { offset: 0.123, opacity: 0 }, { offset: 0.91, opacity: 0, transform: "rotate(14deg)" }, { offset: 0.96, transform: "rotate(-6deg)" }, { offset: 1, opacity: 1, transform: "rotate(0)" }], 3100);
    $(".hw-bat-fly").animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.077 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.9 }, { opacity: 0, offset: 0.93 }, { opacity: 0, offset: 1 }], 3100);
    $(".hw-bat-fly").animate([{ transform: "scaleY(1)" }, { transform: "scaleY(.3)" }], { duration: 120, iterations: 22, direction: "alternate", easing: "ease-in-out", delay: 240 });
    $(".hw-bat-fx").animate([0, -70, -170, -110, 0].map((x, i) => ({ transform: `translateX(${x}px)`, offset: i / 4 })), { duration: 2600, delay: 260, easing: "ease-in-out" });
    $(".hw-bat-fy").animate([[0, 0], [0.2, 36], [0.45, -24], [0.7, -58], [0.9, -12], [1, 0]].map(([offset, y]) => ({ offset, transform: `translateY(${y}px)` })), { duration: 2600, delay: 260, easing: "ease-in-out" });
    return 3100;
  };
  const potion = (el: HTMLElement) => {
    el.querySelector("svg")!.animate([0, -9, 7, -4, 2, 0].map((d) => ({ transform: `rotate(${d}deg)` })), { duration: 700, easing: "ease-out" });
    el.querySelector(".hw-cork")!.animate([{ transform: "none" }, { transform: "translateY(-9px) rotate(18deg)", offset: 0.3 }, { transform: "translateY(-9px) rotate(18deg)", offset: 0.6 }, { transform: "none" }], { duration: 900, easing: "cubic-bezier(.34,1.56,.64,1)" });
    el.querySelectorAll(".hw-bub").forEach((b, i) =>
      b.animate([{ opacity: 0, transform: "translate(0,0) scale(.6)" }, { opacity: 1, offset: 0.2 }, { opacity: 0, transform: `translate(${[-6, 4, -2][i]}px,-34px) scale(1)` }], { duration: 1100, delay: i * 140, easing: "cubic-bezier(.2,.7,.3,1)" }),
    );
    return 1400;
  };
  const web = (el: HTMLElement) => {
    el.querySelector("svg")!.animate([0, -6, 4.5, -3, 1.5, 0].map((d) => ({ transform: `rotate(${d}deg)` })), { duration: 900, easing: "cubic-bezier(.2,.7,.3,1)" });
    el.querySelector(".hw-dew")!.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 700);
    return 900;
  };
  const TOYS: Record<string, (el: HTMLElement) => number> = { spider, cat, bat, potion, web };
  document.querySelectorAll<HTMLElement>("[data-hw]").forEach((el) => {
    let until = 0;
    const on = () => {
      const now = performance.now();
      if (now < until) return;
      const play = TOYS[el.dataset.hw ?? ""];
      if (!play) return;
      if (reduced) {
        until = now + 320;
        (el.firstElementChild as HTMLElement | null)?.animate([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], 320);
        return;
      }
      until = now + play(el);
    };
    el.addEventListener("click", on);
    undo.push(() => {
      el.removeEventListener("click", on);
      el.getAnimations({ subtree: true }).forEach((a) => a instanceof CSSAnimation || a instanceof CSSTransition || a.cancel());
    });
  });

  return () => {
    dead = true;
    timers.forEach(clearTimeout);
    for (const f of undo.splice(0)) f();
  };
}
