import type { ImageMetadata } from "astro";

const found = import.meta.glob<{ default: ImageMetadata }>("../assets/photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG}", { eager: true });

/** src/assets/photos/* 를 파일명 순으로 정렬. 사진이 없으면 빈 배열 */
export const photos: ImageMetadata[] = Object.entries(found)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, m]) => m.default);
