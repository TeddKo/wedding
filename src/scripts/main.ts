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
