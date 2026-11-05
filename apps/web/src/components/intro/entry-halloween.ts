import type { EntryCtx } from "./entry";

/**
 * halloween 진입: 인트로 유령이 봉투 안쪽으로 들어갔다가 커버 유령 자리(아치 우상단)로 날아가 실제 유령과 교체됨.
 * 날아가는 복제본은 body 에 두어 게이트 제거와 무관하게 끝까지 진행.
 */
export default async function run({ gate }: EntryCtx): Promise<void> {
  const src = gate.querySelector<HTMLElement>(".ig-ghost .hw-body");
  const real = document.querySelector<HTMLElement>(".hw-ghost");
  const dst = real?.querySelector<HTMLElement>(".hw-body");
  if (!src || !real || !dst) return;

  document.documentElement.classList.add("hw-handoff");
  real.style.opacity = "0";
  const a = src.getBoundingClientRect();
  const fly = document.createElement("div");
  fly.className = "ig-fly";
  fly.setAttribute("aria-hidden", "true");
  Object.assign(fly.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px` });
  fly.append(src.cloneNode(true));
  document.body.append(fly);
  src.style.visibility = "hidden";

  const acx = a.left + a.width / 2;
  const acy = a.top + a.height / 2;
  /* 봉투 입구 안쪽(덮개가 젖혀진 자리 아래) */
  const env = gate.querySelector(".ig-env")?.getBoundingClientRect();
  const ix = (env ? env.left + env.width / 2 : innerWidth / 2) - acx;
  const iy = (env ? env.top + env.height * 0.35 : innerHeight * 0.6) - acy;
  const inner = `translate(${ix}px, ${iy}px) scale(0.22) rotate(8deg)`;
  try {
    /* 들어가기: 살짝 떠올랐다가 봉투 안으로 감속하며 사라짐(속도 0 에 가깝게 도착해 방향 전환이 보이지 않음) */
    await fly.animate(
      [
        { transform: "none", opacity: 1, easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
        { transform: "translateY(-10px) scale(1.08)", opacity: 1, offset: 0.2, easing: "cubic-bezier(0.55, 0, 0.35, 1)" },
        { transform: inner, opacity: 0 },
      ],
      { delay: 1300, duration: 1000, fill: "forwards" },
    ).finished;

    /* 나오기: 봉투 안에서 천천히 출발해 호를 그리며 커버 유령 자리에 감속 착지 */
    const b = dst.getBoundingClientRect();
    const s = b.width / a.width;
    const ex = b.left + b.width / 2 - acx;
    const ey = b.top + b.height / 2 - acy;
    const mx = ix + (ex - ix) * 0.6 + 24;
    const my = iy + (ey - iy) * 0.6 - 56;
    await fly.animate(
      [
        { transform: inner, opacity: 0, easing: "cubic-bezier(0.45, 0, 0.3, 1)" },
        { transform: `translate(${mx}px, ${my}px) scale(${s * 1.25}) rotate(-6deg)`, opacity: 1, offset: 0.6, easing: "cubic-bezier(0.3, 0.4, 0.3, 1)" },
        { transform: `translate(${ex}px, ${ey}px) scale(${s}) rotate(0deg)`, opacity: 1 },
      ],
      { delay: 120, duration: 1300, fill: "forwards" },
    ).finished;

    /* 교대: 실제 유령(떠다니는 위상·후광 차이 포함)과 짧게 교차 페이드해 순간 교체 티 제거 */
    real.style.transition = "opacity 280ms ease";
    real.style.opacity = "";
    await fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, fill: "forwards" }).finished;
  } finally {
    real.style.opacity = "";
    real.style.transition = "";
    fly.remove();
  }
}
