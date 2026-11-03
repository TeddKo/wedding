import { createFall, svgToImage, type Fall } from "../../lib/fx/fall";
import { FLECKS } from "../../lib/fx/sprites-candy";

/**
 * halloween 테마 연출 모듈. Fx.svelte 가 오픈/테마 전환 시 호출한다.
 * 오픈 버스트, 호박 탭, 엔딩 버스트/유령 손짓, 유령 float 오프스크린 일시정지를 DOM 조회로 연결한다.
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
