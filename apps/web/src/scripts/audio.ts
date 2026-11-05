const KEY = "bgm-state";
const FADE_MS = 2000;
const MAX_VOLUME = 0.6;

let audio: HTMLAudioElement | null = null;
let toggle: HTMLButtonElement | null = null;
let fade = 0;

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
    } else a.volume = v;
  }, 50);
}

function render() {
  if (!toggle || !audio) return;
  const on = !audio.paused;
  toggle.setAttribute("aria-pressed", String(on));
  toggle.setAttribute("aria-label", on ? "배경음악 끄기" : "배경음악 켜기");
  toggle.classList.toggle("is-off", !on);
}

async function start() {
  if (!audio) return;
  audio.volume = 0;
  try {
    await audio.play();
    store("on");
    fadeTo(MAX_VOLUME);
  } catch {
    /* 자동재생 차단: 토글로 재생 */
    store("off");
  }
  render();
}

/** 트랙이 없으면(src 빈 문자열) 아무것도 하지 않고 토글도 숨김. */
export function initAudio(button: HTMLButtonElement | null, src: string) {
  if (!src || !button) return;
  audio = new Audio(src);
  audio.loop = true;
  audio.preload = "none";
  toggle = button;
  toggle.hidden = false;
  render();
  toggle.addEventListener("click", () => {
    if (!audio) return;
    toggle?.classList.toggle("is-off", !audio.paused);
    if (audio.paused) void start();
    else {
      store("off");
      fadeTo(0, () => {
        audio?.pause();
        render();
      });
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!audio) return;
    if (document.hidden) audio.pause();
    else if (stored() === "on") void audio.play().then(render, render);
    render();
  });
}

/** 인트로 탭 직후 호출. 트랙이 없거나 사용자가 이전에 껐다면 no-op. */
export function playBgm() {
  if (!audio || stored() === "off") return;
  void start();
}
