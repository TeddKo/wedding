import { existsSync } from "node:fs";

/** public/audio/bgm.mp3 존재 여부(빌드 시점) */
export const hasMusic = existsSync("public/audio/bgm.mp3");
