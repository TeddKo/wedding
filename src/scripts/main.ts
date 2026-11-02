import { initAudio } from "./audio";

const $ = <T extends Element>(s: string) => document.querySelector<T>(s);
const cfg = document.body.dataset;

initAudio($<HTMLButtonElement>("#bgm-toggle"), cfg.bgm ?? "");
