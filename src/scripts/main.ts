import { initAudio } from "./audio";

const $ = <T extends Element>(s: string) => document.querySelector<T>(s);
const $$ = <T extends Element>(s: string) => [...document.querySelectorAll<T>(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const cfg = document.body.dataset;

initAudio($<HTMLButtonElement>("#bgm-toggle"), cfg.bgm ?? "");

/* 스크롤 reveal */
const reveals = $$(".reveal");
if (reduced || !("IntersectionObserver" in window)) reveals.forEach((e) => e.classList.add("in"));
else {
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.12 },
  );
  reveals.forEach((e) => io.observe(e));
}

/* D-day (KST) */
const dd = $<HTMLElement>("#dday");
if (dd?.dataset.date) {
  const [y, m, d] = dd.dataset.date.split("-").map(Number);
  const kst = new Date(Date.now() + 9 * 3600e3);
  const today = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const n = Math.round((Date.UTC(y, m - 1, d) - today) / 864e5);
  dd.textContent = n > 0 ? `결혼식까지 ${n}일` : n === 0 ? "오늘" : `${-n}일 지났습니다`;
  dd.dataset.n = String(n);
}

/* 복사 */
async function copy(text: string, btn: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  const label = btn.textContent;
  btn.textContent = "복사되었습니다";
  setTimeout(() => (btn.textContent = label), 1500);
}
$$<HTMLElement>("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copy ?? "", b)));
const pageUrl = cfg.pageUrl ?? location.href;
$$<HTMLElement>("[data-copy-url]").forEach((b) => b.addEventListener("click", () => copy(pageUrl, b)));

/* 티맵: 앱 스킴 시도 후 앱이 없으면 카카오맵 검색으로 대체 */
$<HTMLAnchorElement>("[data-tmap]")?.addEventListener("click", (e) => {
  const a = e.currentTarget as HTMLAnchorElement;
  const fallback = a.dataset.fallback ?? "";
  const t = setTimeout(() => {
    if (!document.hidden) location.href = fallback;
  }, 1500);
  document.addEventListener("visibilitychange", () => clearTimeout(t), { once: true });
});

/* 라이트박스: 실제 사진이 있을 때만 */
const lb = $<HTMLDialogElement>("#lightbox");
const thumbs = $$<HTMLButtonElement>("[data-lightbox] [data-full]");
if (lb && thumbs.length) {
  const img = lb.querySelector("img")!;
  let i = 0;
  const show = (n: number) => {
    i = (n + thumbs.length) % thumbs.length;
    img.src = thumbs[i].dataset.full ?? "";
    img.alt = `갤러리 사진 ${i + 1}`;
  };
  thumbs.forEach((t, n) =>
    t.addEventListener("click", () => {
      show(n);
      lb.showModal();
    }),
  );
  lb.querySelector(".lb-close")?.addEventListener("click", () => lb.close());
  lb.querySelector(".lb-prev")?.addEventListener("click", () => show(i - 1));
  lb.querySelector(".lb-next")?.addEventListener("click", () => show(i + 1));
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(i - 1);
    if (e.key === "ArrowRight") show(i + 1);
  });
  lb.addEventListener("click", (e) => e.target === lb && lb.close());
  let x0 = 0;
  lb.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
  });
}

/* 카카오 공유: SDK 로드 실패 시 버튼은 숨겨진 채로 둔다 */
const kbtn = $<HTMLButtonElement>("#kakao-share");
if (kbtn && cfg.kakaoKey) {
  const s = document.createElement("script");
  s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js";
  s.integrity = "sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w";
  s.crossOrigin = "anonymous";
  s.onload = () => {
    try {
      const K = (window as any).Kakao;
      if (!K.isInitialized()) K.init(cfg.kakaoKey);
      kbtn.hidden = false;
      kbtn.addEventListener("click", () =>
        K.Share.sendDefault({
          objectType: "feed",
          content: {
            title: cfg.shareTitle,
            description: cfg.shareDesc,
            imageUrl: cfg.ogImage,
            imageWidth: 1200,
            imageHeight: 630,
            link: { mobileWebUrl: pageUrl, webUrl: pageUrl },
          },
          buttons: [{ title: "청첩장 보기", link: { mobileWebUrl: pageUrl, webUrl: pageUrl } }],
        }),
      );
    } catch {
      kbtn.hidden = true;
    }
  };
  s.onerror = () => (kbtn.hidden = true);
  document.head.append(s);
}
