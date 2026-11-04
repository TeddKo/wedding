import { initAudio } from "./audio";
import { lockZoom } from "./zoom";

const $ = <T extends Element>(s: string) => document.querySelector<T>(s);
const cfg = document.body.dataset;

lockZoom();
initAudio($<HTMLButtonElement>("#bgm-toggle"), cfg.bgm ?? "");
