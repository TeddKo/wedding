import { createFall, svgToImage, type Fall } from "../../lib/fx/fall";
import { FLECKS } from "../../lib/fx/sprites-candy";

/**
 * halloween 테마 연출 모듈. Fx.svelte 가 오픈/테마 전환 시 호출한다.
 * 오픈 버스트, 호박·사탕 바구니 탭, 촛불 끄기/켜기, 엔딩 유령 인사·도망, 유령 float 오프스크린 일시정지를 DOM 조회로 연결한다.
 * @param ctx first=true 면 시그니처 연출 1회 재생 시점
 * @returns 정리 함수(타이머/캔버스/리스너 해제)
 */
export function start(ctx: { first: boolean }): () => void {
  let dead = false;
  const undo: (() => void)[] = [];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);

  const float = q(".hw-float");
  if (float && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => float.classList.toggle("fx-paused", !e.isIntersecting));
    io.observe(float);
    undo.push(() => {
      io.disconnect();
      float.classList.remove("fx-paused");
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

  /* 사탕 바구니: 탭하면 들썩이고(사탕 이펙트는 아래 fall 준비 후 연결) */
  const basket = q<HTMLButtonElement>(".hw-basket");
  const jiggle = () =>
    basket?.animate([0, -9, 7, -4, 0].map((d, i) => ({ transform: `rotate(${d}deg) scale(${i === 1 ? 0.94 : 1})` })), { duration: reduced ? 1 : 520, easing: "ease-out" });
  if (basket) {
    basket.addEventListener("click", jiggle);
    undo.push(() => basket.removeEventListener("click", jiggle));
  }

  if (!reduced) {
    Promise.all(FLECKS.map(svgToImage))
      .then((sprites) => {
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
          const onBasket = () => {
            const now = performance.now();
            if (now - last < 600) return;
            last = now;
            const r = basket.getBoundingClientRect();
            fall.spawnAt(r.left + r.width / 2, r.top + r.height * 0.45, 7, { vy: -190, spreadX: 60, spreadY: 30 });
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

  return () => {
    dead = true;
    for (const f of undo.splice(0)) f();
  };
}
