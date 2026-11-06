import { url } from "../lib/url";

const KEY = "bgm-state";
const FADE_MS = 600;
const MAX_VOLUME = 0.6;

let audio: HTMLAudioElement | null = null;
let toggle: HTMLButtonElement | null = null;
let fade = 0;
let hiding = false;
let priming = false;

const stored = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const store = (v: "on" | "off") => {
  try {
    sessionStorage.setItem(KEY, v);
  } catch {
    /* sessionStorage 사용 불가 */
  }
};

function fadeTo(target: number, done?: () => void) {
  if (!audio) return;
  clearInterval(fade);
  const a = audio;
  const step = ((target - a.volume) / FADE_MS) * 50;
  fade = window.setInterval(() => {
    const v = a.volume + step;
    if ((step > 0 && v >= target) || (step <= 0 && v <= target)) {
      a.volume = target;
      clearInterval(fade);
      done?.();
    } else {
      a.volume = v;
      /* iOS: volume 읽기 전용(항상 1) — 페이드 불가, 즉시 완료 처리 */
      if (Math.abs(a.volume - v) > 0.01) {
        clearInterval(fade);
        done?.();
      }
    }
  }, 50);
}

function render() {
  if (!toggle || !audio) return;
  const on = !audio.paused;
  toggle.setAttribute("aria-pressed", String(on));
  toggle.setAttribute("aria-label", on ? "배경음악 끄기" : "배경음악 켜기");
  toggle.classList.toggle("is-off", !on);
}

function onPlay() {
  store("on");
  if (audio && audio.volume < MAX_VOLUME) fadeTo(MAX_VOLUME);
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
  render();
}

async function resume() {
  if (!audio) return;
  audio.volume = 0;
  try {
    await audio.play();
  } catch {
    /* 자동재생 차단: 토글로 재생 */
    store("off");
    render();
  }
}

function stop() {
  store("off");
  fadeTo(0, () => audio?.pause());
}

/** 트랙이 없으면(src 빈 문자열) 아무것도 하지 않고 토글도 숨김. */
export function initAudio(button: HTMLButtonElement | null, src: string) {
  if (!src || !button) return;
  const a = (audio = new Audio(src));
  a.loop = true;
  a.preload = "none";
  toggle = button;
  toggle.hidden = false;
  render();
  a.addEventListener("play", () => {
    if (!priming) onPlay();
  });
  a.addEventListener("pause", () => {
    if (priming) {
      priming = false;
      a.muted = false;
      return;
    }
    if (!hiding) store("off");
    hiding = false;
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    render();
  });
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: "Candlelit Vows",
      album: "Wedding Invitation",
      artwork: [{ src: new URL(url("og.jpg"), location.origin).href, type: "image/jpeg" }],
    });
    ms.setActionHandler("play", () => void resume());
    ms.setActionHandler("pause", stop);
  }
  toggle.addEventListener("click", () => {
    toggle?.classList.toggle("is-off", !a.paused);
    if (a.paused) void resume();
    else stop();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiding = !a.paused;
      a.pause();
    } else if (stored() === "on") void a.play().catch(render);
  });
}

/**
 * 인장 탭(사용자 제스처) 순간 호출. 무음 재생 후 즉시 정지로 제스처 밖 재생 차단(iOS 등) 해제 + 버퍼링 선행.
 * 트랙이 없거나 사용자가 이전에 껐다면 no-op.
 */
export function primeBgm() {
  const a = audio;
  if (!a || stored() === "off" || !a.paused) return;
  priming = true;
  a.muted = true;
  a.play().then(
    () => {
      if (priming) a.pause();
    },
    () => {
      priming = false;
      a.muted = false;
    },
  );
}

/** 인트로 연출 종료 후 본문 진입 시점 호출. 준비 재생이 아직 진행 중이면 그대로 이어서 페이드인 */
export function playBgm() {
  if (!audio || stored() === "off") return;
  if (priming) {
    priming = false;
    audio.muted = false;
    audio.volume = 0;
    onPlay();
    return;
  }
  if (audio.paused) void resume();
}
